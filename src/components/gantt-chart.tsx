"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";

interface GanttProjectLink {
  label: string;
  url: string;
}

interface GanttMilestone {
  _id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  statusLabel: string;
  statusColor: string;
  assignee?: string;
}

interface GanttProject {
  _id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  effectiveEndDate?: string;
  statusColor: string;
  statusLabel: string;
  leads?: string[];
  links?: GanttProjectLink[];
  milestones?: GanttMilestone[];
  hasMilestones?: boolean;
  color?: string;
}

interface GanttChartProps {
  projects: GanttProject[];
  startDate: string;
  endDate: string;
  onExpandProject?: (projectId: string) => void;
  highlightedId?: string | null;
}

function parseLocalDate(dateStr: string): Date {
  const d = dateStr.split("T")[0].split("-");
  return new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
}

function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getWeeksBetween(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];
  const current = new Date(start);
  current.setDate(current.getDate() - current.getDay() + 1);

  while (current <= end) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function formatWeekLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * amount));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 - ((num >> 8) & 0x00ff)) * amount));
  const b = Math.min(255, (num & 0x0000ff) + Math.round((255 - (num & 0x0000ff)) * amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

function ProjectPopoverContent({ project }: { project: GanttProject }) {
  const milestoneCount = project.milestones?.length ?? 0;
  return (
    <div className="space-y-2">
      <div className="font-medium leading-snug">{project.title}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Status</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.statusColor }} />
            {project.statusLabel}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Assignee</span>
          <div className="mt-0.5">{project.leads?.length ? project.leads.join(", ") : "Unassigned"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Start</span>
          <div className="mt-0.5">{formatDate(project.plannedStart)}</div>
        </div>
        <div>
          <span className="text-muted-foreground">End</span>
          <div className="mt-0.5">{formatDate(project.plannedEnd)}</div>
        </div>
        {milestoneCount > 0 && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Milestones</span>
            <div className="mt-0.5">{milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""}</div>
          </div>
        )}
      </div>
      {project.links && project.links.length > 0 && (
        <div className="text-xs pt-1 border-t border-border/50">
          <span className="text-muted-foreground">Links</span>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {project.links.slice(0, 3).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {link.label || link.url}
              </a>
            ))}
            {project.links.length > 3 && (
              <span className="text-muted-foreground">+{project.links.length - 3} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function GanttChart({ projects, startDate, endDate, onExpandProject, highlightedId }: GanttChartProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = getWeeksBetween(start, end);
  const chartEnd = weeks.length > 0
    ? new Date(weeks[weeks.length - 1].getTime() + 7 * 24 * 60 * 60 * 1000)
    : end;
  const totalDays = (chartEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (weeks.length === 0 || totalDays <= 0) {
    return <p className="text-sm text-muted-foreground">Invalid date range for Gantt chart.</p>;
  }

  function getPosition(date: Date): number {
    const days = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }

  function toggleExpand(projectId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
        onExpandProject?.(projectId);
      }
      return next;
    });
  }

  const weekPositions = weeks.map((week) => getPosition(week));

  const currentWeekIdx = weeks.findIndex((w, i) => {
    const nextWeek = i < weeks.length - 1 ? weeks[i + 1] : end;
    return today >= w && today < nextWeek;
  });
  const currentWeekLeft = currentWeekIdx >= 0 ? weekPositions[currentWeekIdx] : -1;
  const currentWeekRight = currentWeekIdx >= 0
    ? (currentWeekIdx < weeks.length - 1 ? weekPositions[currentWeekIdx + 1] : 100)
    : -1;
  const currentWeekWidth = currentWeekRight - currentWeekLeft;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="flex border-b border-border pb-1 mb-0">
          <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">
            Project
          </div>
          <div className="flex-1 relative">
            {currentWeekLeft >= 0 && (
              <div
                className="absolute top-0 h-full bg-primary/10 rounded-sm"
                style={{ left: `${currentWeekLeft}%`, width: `${currentWeekWidth}%` }}
              />
            )}
            {weeks.map((week, i) => {
              const left = weekPositions[i];
              if (left < 0) return null;
              return (
                <div
                  key={i}
                  className="absolute text-xs text-muted-foreground border-l border-border/60 pl-1"
                  style={{ left: `${left}%` }}
                >
                  {formatWeekLabel(week)}
                </div>
              );
            })}
            <div className="invisible text-xs">&nbsp;</div>
          </div>
        </div>

        {/* Rows */}
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No projects to display.</p>
        ) : (
          projects.map((project) => {
            const projStart = parseLocalDate(project.plannedStart);
            const projEnd = parseLocalDate(project.plannedEnd);
            const effectiveEnd = project.effectiveEndDate ? parseLocalDate(project.effectiveEndDate) : projEnd;
            const hasOverage = effectiveEnd > projEnd;
            const isExpanded = expandedIds.has(project._id);
            const hasMilestones = project.hasMilestones || (project.milestones?.length ?? 0) > 0;
            const barColor = project.color || project.statusColor;

            const startWeekIdx = weeks.findIndex((w, i) => {
              const nextWeek = i < weeks.length - 1 ? weeks[i + 1] : end;
              return projStart >= w && projStart < nextWeek;
            });
            const endWeekIdx = weeks.findIndex((w, i) => {
              const nextWeek = i < weeks.length - 1 ? weeks[i + 1] : end;
              return projEnd >= w && projEnd < nextWeek;
            });
            const effectiveEndWeekIdx = hasOverage ? weeks.findIndex((w, i) => {
              const nextWeek = i < weeks.length - 1 ? weeks[i + 1] : end;
              return effectiveEnd >= w && effectiveEnd < nextWeek;
            }) : -1;

            const barLeft = startWeekIdx >= 0 ? weekPositions[startWeekIdx] : getPosition(projStart);
            const barRight = endWeekIdx >= 0
              ? (endWeekIdx < weeks.length - 1 ? weekPositions[endWeekIdx + 1] : 100)
              : getPosition(projEnd);
            const overageRight = hasOverage
              ? (effectiveEndWeekIdx >= 0
                ? (effectiveEndWeekIdx < weeks.length - 1 ? weekPositions[effectiveEndWeekIdx + 1] : 100)
                : getPosition(effectiveEnd))
              : barRight;
            const barWidth = Math.max(barRight - barLeft, 1);
            const overageWidth = hasOverage ? Math.max(overageRight - barRight, 0) : 0;

            // Clipping indicators for milestones
            let milestonesBefore = 0;
            let milestonesAfter = 0;
            if (project.milestones) {
              for (const m of project.milestones) {
                const mEnd = parseLocalDate(m.plannedEnd);
                const mStart = parseLocalDate(m.plannedStart);
                if (mEnd < start) milestonesBefore++;
                else if (mStart > end) milestonesAfter++;
              }
            }

            const popoverContent = <ProjectPopoverContent project={project} />;

            const isHighlighted = highlightedId === project._id;

            return (
              <div key={project._id}>
                {/* Project row */}
                <div className={`flex items-center min-h-10 py-1 transition-colors ${isHighlighted ? "bg-primary/20 ring-1 ring-primary/50 rounded" : ""}`}>
                  <Popover content={popoverContent} delay={600} position="top">
                    <div
                      className={`w-48 shrink-0 flex items-start gap-0.5 pr-2 text-sm leading-snug ${hasMilestones ? "cursor-pointer hover:text-primary" : "cursor-default"}`}
                      onClick={() => hasMilestones && toggleExpand(project._id)}
                    >
                      {hasMilestones ? (
                        <span className="w-4 shrink-0 text-xs text-muted-foreground pt-0.5">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <span className="min-w-0">{project.title}</span>
                    </div>
                  </Popover>
                  <div className="flex-1 relative min-h-8 self-stretch">
                    {/* Current week highlight */}
                    {currentWeekLeft >= 0 && (
                      <div
                        className="absolute top-0 h-full bg-primary/10"
                        style={{ left: `${currentWeekLeft}%`, width: `${currentWeekWidth}%` }}
                      />
                    )}
                    {/* Week grid lines */}
                    {weekPositions.map((pos, i) =>
                      pos >= 0 ? (
                        <div
                          key={i}
                          className="absolute top-0 h-full border-l border-border/30"
                          style={{ left: `${pos}%` }}
                        />
                      ) : null
                    )}
                    {/* Planned bar (original commitment) */}
                    <Popover content={popoverContent} delay={600} position="top">
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-4 ${hasOverage ? "rounded-l-sm" : "rounded-sm"} ${hasMilestones ? "cursor-pointer" : "cursor-default"}`}
                        style={{
                          left: `${barLeft}%`,
                          width: `${barWidth}%`,
                          backgroundColor: barColor,
                        }}
                        onClick={() => hasMilestones && toggleExpand(project._id)}
                      />
                    </Popover>
                    {/* Overage extension (striped) — beyond original planned end */}
                    {hasOverage && overageWidth > 0 && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-4 rounded-r-sm"
                        style={{
                          left: `${barRight}%`,
                          width: `${overageWidth}%`,
                          backgroundImage: `repeating-linear-gradient(
                            -45deg,
                            ${barColor},
                            ${barColor} 2px,
                            transparent 2px,
                            transparent 6px
                          )`,
                          opacity: 0.7,
                        }}
                      />
                    )}
                    {/* Clipping indicators */}
                    {milestonesBefore > 0 && (
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 text-[10px] text-muted-foreground">
                        ← {milestonesBefore} before
                      </div>
                    )}
                    {milestonesAfter > 0 && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-0 text-[10px] text-muted-foreground">
                        {milestonesAfter} after →
                      </div>
                    )}
                    {/* Today marker */}
                    {today >= start && today <= end && (
                      <div
                        className="absolute top-0 w-0.5 h-full bg-primary"
                        style={{ left: `${getPosition(today)}%` }}
                        title="Today"
                      />
                    )}
                  </div>
                </div>

                {/* Expanded milestones */}
                {isExpanded && project.milestones && project.milestones
                  .filter((m) => {
                    const mStart = parseLocalDate(m.plannedStart);
                    const mEnd = parseLocalDate(m.plannedEnd);
                    return mEnd >= start && mStart <= end;
                  })
                  .map((milestone) => {
                    const mStart = parseLocalDate(milestone.plannedStart);
                    const mEnd = parseLocalDate(milestone.plannedEnd);
                    const mLeft = getPosition(mStart < start ? start : mStart);
                    const mRight = getPosition(mEnd > end ? end : mEnd);
                    const mWidth = Math.max(mRight - mLeft, 0.5);
                    const milestoneColor = lightenColor(barColor, 0.25);

                    return (
                      <div key={milestone._id} className="flex items-center min-h-8 py-0.5">
                        <div className="w-48 shrink-0 text-xs pr-2 pl-6 leading-snug text-muted-foreground">
                          {milestone.title}
                        </div>
                        <div className="flex-1 relative min-h-6 self-stretch">
                          {currentWeekLeft >= 0 && (
                            <div
                              className="absolute top-0 h-full bg-primary/10"
                              style={{ left: `${currentWeekLeft}%`, width: `${currentWeekWidth}%` }}
                            />
                          )}
                          {weekPositions.map((pos, i) =>
                            pos >= 0 ? (
                              <div
                                key={i}
                                className="absolute top-0 h-full border-l border-border/20"
                                style={{ left: `${pos}%` }}
                              />
                            ) : null
                          )}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 rounded-sm"
                            style={{
                              left: `${mLeft}%`,
                              width: `${mWidth}%`,
                              backgroundColor: milestoneColor,
                            }}
                            title={`${milestone.title} (${milestone.statusLabel})`}
                          />
                          {today >= start && today <= end && (
                            <div
                              className="absolute top-0 w-0.5 h-full bg-primary"
                              style={{ left: `${getPosition(today)}%` }}
                              title="Today"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
