"use client";

import { Popover } from "@/components/ui/popover";

interface GanttProjectLink {
  label: string;
  url: string;
}

interface GanttProject {
  _id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  statusColor: string;
  statusLabel: string;
  leads?: string[];
  links?: GanttProjectLink[];
}

interface GanttChartProps {
  projects: GanttProject[];
  startDate: string;
  endDate: string;
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

function ProjectPopoverContent({ project }: { project: GanttProject }) {
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

export function GanttChart({ projects, startDate, endDate }: GanttChartProps) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = getWeeksBetween(start, end);
  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (weeks.length === 0 || totalDays <= 0) {
    return <p className="text-sm text-muted-foreground">Invalid date range for Gantt chart.</p>;
  }

  function getPosition(date: Date): number {
    const days = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }

  function isOverrun(project: GanttProject): boolean {
    const plannedEnd = parseLocalDate(project.plannedEnd);
    const doneStatuses = ["done", "complete", "completed"];
    return (
      today > plannedEnd && !doneStatuses.includes(project.statusLabel.toLowerCase())
    );
  }

  const weekPositions = weeks.map((week) => getPosition(week));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="flex border-b border-border pb-1 mb-0">
          <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">
            Project
          </div>
          <div className="flex-1 relative">
            {weeks.map((week, i) => {
              const left = weekPositions[i];
              if (left <= 0) return null;
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

            const startWeekIdx = weeks.findIndex((w, i) => {
              const nextWeek = i < weeks.length - 1 ? weeks[i + 1] : end;
              return projStart >= w && projStart < nextWeek;
            });
            const endWeekIdx = weeks.findIndex((w, i) => {
              const nextWeek = i < weeks.length - 1 ? weeks[i + 1] : end;
              return projEnd >= w && projEnd < nextWeek;
            });

            const barLeft = startWeekIdx >= 0 ? weekPositions[startWeekIdx] : getPosition(projStart);
            const barRight = endWeekIdx >= 0
              ? (endWeekIdx < weeks.length - 1 ? weekPositions[endWeekIdx + 1] : 100)
              : getPosition(projEnd);
            const barWidth = Math.max(barRight - barLeft, 1);
            const overrun = isOverrun(project);
            const overrunRight = overrun ? getPosition(today) : barRight;
            const overrunWidth = overrunRight - barRight;

            const popoverContent = <ProjectPopoverContent project={project} />;

            return (
              <div key={project._id} className="flex items-center h-10">
                <Popover content={popoverContent}>
                  <div className="w-48 shrink-0 text-sm truncate pr-2 cursor-default">
                    {project.title}
                  </div>
                </Popover>
                <div className="flex-1 relative h-8">
                  {/* Week grid lines */}
                  {weekPositions.map((pos, i) =>
                    pos > 0 ? (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l border-border/30"
                        style={{ left: `${pos}%` }}
                      />
                    ) : null
                  )}
                  {/* Planned bar */}
                  <Popover content={popoverContent}>
                    <div
                      className="absolute top-2 h-4 rounded-sm cursor-default"
                      style={{
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        backgroundColor: project.statusColor,
                      }}
                    />
                  </Popover>
                  {/* Overrun extension */}
                  {overrun && overrunWidth > 0 && (
                    <div
                      className="absolute top-2 h-4 rounded-r-sm"
                      style={{
                        left: `${barRight}%`,
                        width: `${overrunWidth}%`,
                        backgroundColor: project.statusColor,
                        opacity: 0.4,
                      }}
                    />
                  )}
                  {/* Today marker */}
                  {today >= start && today <= end && (
                    <div
                      className="absolute top-0 w-0.5 h-full bg-primary"
                      style={{ left: `${getPosition(today)}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
