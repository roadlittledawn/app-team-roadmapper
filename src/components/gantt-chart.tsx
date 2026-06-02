"use client";

interface GanttProject {
  _id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  statusColor: string;
  statusLabel: string;
}

interface GanttChartProps {
  projects: GanttProject[];
  startDate: string;
  endDate: string;
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

export function GanttChart({ projects, startDate, endDate }: GanttChartProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
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
    const plannedEnd = new Date(project.plannedEnd);
    const doneStatuses = ["done", "complete", "completed"];
    return (
      today > plannedEnd && !doneStatuses.includes(project.statusLabel.toLowerCase())
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="flex border-b border-border pb-1 mb-2">
          <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">
            Project
          </div>
          <div className="flex-1 flex">
            {weeks.map((week, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground text-center"
                style={{ width: `${100 / weeks.length}%` }}
              >
                {formatWeekLabel(week)}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No projects to display.</p>
        ) : (
          projects.map((project) => {
            const barLeft = getPosition(new Date(project.plannedStart));
            const barRight = getPosition(new Date(project.plannedEnd));
            const barWidth = Math.max(barRight - barLeft, 1);
            const overrun = isOverrun(project);
            const overrunRight = overrun ? getPosition(today) : barRight;
            const overrunWidth = overrunRight - barRight;

            return (
              <div key={project._id} className="flex items-center h-10 group">
                <div className="w-48 shrink-0 text-sm truncate pr-2" title={project.title}>
                  {project.title}
                </div>
                <div className="flex-1 relative h-6 bg-muted/30 rounded-sm">
                  {/* Planned bar */}
                  <div
                    className="absolute top-1 h-4 rounded-sm"
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      backgroundColor: project.statusColor,
                    }}
                  />
                  {/* Overrun extension */}
                  {overrun && overrunWidth > 0 && (
                    <div
                      className="absolute top-1 h-4 rounded-r-sm"
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
                      className="absolute top-0 w-px h-full bg-foreground/30"
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
