"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GanttChart } from "@/components/gantt-chart";
import { CapacityOverview } from "@/components/capacity-overview";

interface Roadmap {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  estimationMode: "points" | "sizes-only";
  budget: number | null;
  status: string;
}

interface Project {
  _id: string;
  title: string;
  size: string | null;
  pointEstimate: number | null;
  plannedStart: string;
  plannedEnd: string;
  statusId: string;
  leads: string[];
}

interface Status {
  _id: string;
  label: string;
  color: string;
}

interface SizingConfig {
  sizes: { label: string; weight: number }[];
}

export default function RoadmapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const roadmapId = params.roadmapId as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sizingConfig, setSizingConfig] = useState<SizingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [teamId, roadmapId]);

  async function fetchAll() {
    const [rmRes, statusRes, sizingRes] = await Promise.all([
      fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}`),
      fetch(`/api/teams/${teamId}/statuses`),
      fetch(`/api/teams/${teamId}/sizing-config`),
    ]);

    if (rmRes.ok) {
      const data = await rmRes.json();
      setRoadmap(data.roadmap);
      setProjects(data.projects);
    }
    if (statusRes.ok) {
      const data = await statusRes.json();
      setStatuses(data.statuses);
    }
    if (sizingRes.ok) {
      const data = await sizingRes.json();
      setSizingConfig(data.sizingConfig);
    }
    setLoading(false);
  }

  function getStatus(statusId: string) {
    return statuses.find((s) => s._id === statusId) || { label: "Unknown", color: "#6b7280" };
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Roadmap not found</p>
      </div>
    );
  }

  const ganttProjects = projects.map((p) => {
    const status = getStatus(p.statusId);
    return {
      _id: p._id,
      title: p.title,
      plannedStart: p.plannedStart,
      plannedEnd: p.plannedEnd,
      statusColor: status.color,
      statusLabel: status.label,
    };
  });

  const capacityProjects = projects.map((p) => {
    const status = getStatus(p.statusId);
    return {
      size: p.size,
      pointEstimate: p.pointEstimate,
      statusLabel: status.label,
      statusColor: status.color,
    };
  });

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.push(`/teams/${teamId}`)}>
            &larr; Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{roadmap.title}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(roadmap.startDate).toLocaleDateString()} –{" "}
              {new Date(roadmap.endDate).toLocaleDateString()} | {roadmap.estimationMode} mode
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Capacity Overview */}
          <CapacityOverview
            projects={capacityProjects}
            estimationMode={roadmap.estimationMode}
            budget={roadmap.budget}
            sizeWeights={sizingConfig?.sizes.map((s) => ({ label: s.label, weight: s.weight })) || []}
          />

          {/* Gantt Chart */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Timeline</h2>
            <GanttChart
              projects={ganttProjects}
              startDate={roadmap.startDate}
              endDate={roadmap.endDate}
            />
          </div>

          {/* Project List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
            </div>

            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet. Add your first project to this roadmap.
              </p>
            ) : (
              <div className="grid gap-2">
                {projects.map((project) => {
                  const status = getStatus(project.statusId);
                  return (
                    <div
                      key={project._id}
                      className="flex items-center justify-between rounded-md border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <div>
                          <span className="font-medium">{project.title}</span>
                          {project.size && (
                            <span className="ml-2 text-xs text-muted-foreground border border-border rounded px-1">
                              {project.size}
                            </span>
                          )}
                          {project.pointEstimate && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({project.pointEstimate} pts)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.plannedStart).toLocaleDateString()} –{" "}
                        {new Date(project.plannedEnd).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
