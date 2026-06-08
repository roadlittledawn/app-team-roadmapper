"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Search } from "lucide-react";

interface ProjectRow {
  _id: string;
  title: string;
  color: string;
  statusId: string;
  plannedStart: string;
  plannedEnd: string;
  currentEndDate?: string | null;
  leads: string[];
  roadmapIds: string[];
  milestoneCount: number;
}

interface Status {
  _id: string;
  label: string;
  color: string;
}

interface RoadmapInfo {
  _id: string;
  title: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
}

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRoadmap, setFilterRoadmap] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  useEffect(() => {
    fetchData();
  }, [teamId]);

  async function fetchData() {
    const [projRes, statusRes, roadmapRes] = await Promise.all([
      fetch(`/api/teams/${teamId}/projects`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/statuses`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/roadmaps`, { cache: "no-store" }),
    ]);

    if (projRes.ok) {
      const data = await projRes.json();
      setProjects(data.projects);
    }
    if (statusRes.ok) {
      const data = await statusRes.json();
      setStatuses(data.statuses);
    }
    if (roadmapRes.ok) {
      const data = await roadmapRes.json();
      setRoadmaps(data.roadmaps);
    }
    setLoading(false);
  }

  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.leads?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && p.statusId !== filterStatus) return false;
      if (filterRoadmap && !p.roadmapIds.includes(filterRoadmap)) return false;
      if (filterAssignee && (!p.leads || !p.leads.includes(filterAssignee))) return false;
      return true;
    });
  }, [projects, search, filterStatus, filterRoadmap, filterAssignee]);

  function getStatus(statusId: string) {
    return statuses.find((s) => s._id === statusId) || { label: "Unknown", color: "#6b7280" };
  }

  function getRoadmapTitles(roadmapIds: string[]) {
    return roadmapIds
      .map((id) => roadmaps.find((r) => r._id === id)?.title)
      .filter(Boolean)
      .join(", ");
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.push(`/teams/${teamId}`)}>
            <ArrowLeft /> Back
          </Button>
          <h1 className="text-2xl font-bold">All Projects</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-8 input-field text-sm"
            />
          </div>
          <select
            value={filterRoadmap}
            onChange={(e) => setFilterRoadmap(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">All Roadmaps</option>
            {roadmaps.map((r) => (
              <option key={r._id} value={r._id}>{r.title}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s._id} value={s._id}>{s.label}</option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">All Assignees</option>
            {allAssignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Title</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Lead</th>
                <th className="text-left px-4 py-2 font-medium">Roadmap(s)</th>
                <th className="text-left px-4 py-2 font-medium">Start</th>
                <th className="text-left px-4 py-2 font-medium">End</th>
                <th className="text-center px-4 py-2 font-medium">Milestones</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {projects.length === 0 ? "No projects yet." : "No projects match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const status = getStatus(p.statusId);
                  return (
                    <tr
                      key={p._id}
                      className="border-t border-border hover:bg-accent/20 cursor-pointer transition-colors"
                      onClick={() => router.push(`/teams/${teamId}/projects/${p._id}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="font-medium">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {p.leads?.length ? p.leads.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {getRoadmapTitles(p.roadmapIds) || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(p.plannedStart)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(p.plannedEnd)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {p.milestoneCount || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/teams/${teamId}/projects/${p._id}`);
                          }}
                          title="Edit project"
                        >
                          <Pencil />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Showing {filtered.length} of {projects.length} projects
        </p>
      </div>
    </div>
  );
}
