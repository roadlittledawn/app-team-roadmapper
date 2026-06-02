"use client";

interface CapacityProject {
  size: string | null;
  pointEstimate: number | null;
  statusLabel: string;
  statusColor: string;
}

interface SizeWeight {
  label: string;
  weight: number;
}

interface CapacityOverviewProps {
  projects: CapacityProject[];
  estimationMode: "points" | "sizes-only";
  budget: number | null;
  sizeWeights: SizeWeight[];
}

export function CapacityOverview({
  projects,
  estimationMode,
  budget,
  sizeWeights,
}: CapacityOverviewProps) {
  const sizeCounts: Record<string, number> = {};
  const statusCounts: Record<string, { count: number; color: string }> = {};
  let totalEffort = 0;

  for (const project of projects) {
    if (project.size) {
      sizeCounts[project.size] = (sizeCounts[project.size] || 0) + 1;
    }

    const key = project.statusLabel;
    if (!statusCounts[key]) {
      statusCounts[key] = { count: 0, color: project.statusColor };
    }
    statusCounts[key].count++;

    if (estimationMode === "points") {
      totalEffort += project.pointEstimate || 0;
    } else {
      const weight = sizeWeights.find((sw) => sw.label === project.size)?.weight || 0;
      totalEffort += weight;
    }
  }

  const unit = estimationMode === "points" ? "pts" : "units";
  const overCommitted = budget !== null && totalEffort > budget;
  const utilization = budget ? Math.round((totalEffort / budget) * 100) : null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <h3 className="text-sm font-semibold">Capacity Overview</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{projects.length}</div>
          <div className="text-xs text-muted-foreground">Projects</div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {totalEffort} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
          </div>
          <div className="text-xs text-muted-foreground">Total Effort</div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {budget ?? "—"} <span className="text-sm font-normal text-muted-foreground">{budget ? unit : ""}</span>
          </div>
          <div className="text-xs text-muted-foreground">Budget</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${overCommitted ? "text-destructive" : ""}`}>
            {utilization !== null ? `${utilization}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Utilization</div>
        </div>
      </div>

      {/* Budget bar */}
      {budget !== null && (
        <div className="space-y-1">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overCommitted ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min(utilization || 0, 100)}%` }}
            />
          </div>
          {overCommitted && (
            <p className="text-xs text-destructive font-medium">
              Over budget by {totalEffort - budget} {unit}
            </p>
          )}
        </div>
      )}

      {/* Breakdown by size */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">By Size</div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(sizeCounts).map(([size, count]) => (
            <span key={size} className="text-sm">
              <span className="font-medium">{size}</span>
              <span className="text-muted-foreground ml-1">×{count}</span>
            </span>
          ))}
          {Object.keys(sizeCounts).length === 0 && (
            <span className="text-sm text-muted-foreground">No sizes assigned</span>
          )}
        </div>
      </div>

      {/* Breakdown by status */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">By Status</div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(statusCounts).map(([label, { count, color }]) => (
            <span key={label} className="flex items-center gap-1 text-sm">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{label}</span>
              <span className="text-muted-foreground">×{count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
