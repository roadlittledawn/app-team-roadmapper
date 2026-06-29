"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { GanttChart } from "@/components/gantt-chart";
import { CapacityOverview } from "@/components/capacity-overview";
import { MilestoneManager } from "@/components/milestone-manager";
import { MarkdownContent } from "@/components/markdown-content";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ArrowLeft, ExternalLink, Info, Maximize2, Minimize2, Pencil, Plus, X } from "lucide-react";

const PROJECT_PALETTE = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
  "#ec4899", "#f97316", "#14b8a6", "#6366f1", "#84cc16",
  "#e11d48", "#0ea5e9", "#a855f7", "#eab308", "#22d3ee",
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
}

interface Roadmap {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  estimationMode: "points" | "sizes-only";
  budget: number | null;
  status: string;
}

interface ProjectLink {
  label: string;
  url: string;
}

interface Milestone {
  _id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  statusId: string;
  assignee: string;
  size: string | null;
  pointEstimate: number | null;
}

interface Project {
  _id: string;
  title: string;
  description: string;
  size: string | null;
  pointEstimate: number | null;
  color: string;
  plannedStart: string;
  plannedEnd: string;
  currentEndDate?: string | null;
  statusId: string;
  statusOverride?: string | null;
  leads: string[];
  links: ProjectLink[];
  milestoneCount?: number;
}

interface Status {
  _id: string;
  label: string;
  color: string;
}

interface Member {
  _id: string;
  name: string;
  role: string;
}

interface SizeEntry {
  label: string;
  minPoints: number;
  maxPoints: number;
  weeksReference: string;
  weight: number;
}

interface SizingConfig {
  sizes: SizeEntry[];
}

export default function RoadmapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const roadmapId = params.roadmapId as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sizingConfig, setSizingConfig] = useState<SizingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [ganttFullscreen, setGanttFullscreen] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState(false);
  const [rmTitle, setRmTitle] = useState("");
  const [rmStart, setRmStart] = useState("");
  const [rmEnd, setRmEnd] = useState("");
  const [rmBudget, setRmBudget] = useState("");
  const [rmStatus, setRmStatus] = useState<"active" | "archived">("active");
  const [rmSaving, setRmSaving] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [projectMilestones, setProjectMilestones] = useState<Record<string, Milestone[]>>({});
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatusId, setProjectStatusId] = useState("");
  const [projectSize, setProjectSize] = useState("");
  const [projectPoints, setProjectPoints] = useState("");
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [projectLeads, setProjectLeads] = useState<string[]>([]);
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [projectError, setProjectError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSizingRef, setShowSizingRef] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [allTeamProjects, setAllTeamProjects] = useState<{ _id: string; title: string; roadmapIds: string[] }[]>([]);
  const [addingExisting, setAddingExisting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [teamId, roadmapId]);

  async function fetchAll() {
    const [rmRes, statusRes, sizingRes, membersRes] = await Promise.all([
      fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/statuses`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/sizing-config`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/members`, { cache: "no-store" }),
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
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members);
    }
    setLoading(false);
  }

  useEffect(() => {
    const projectsWithMilestones = projects.filter(
      (p) => (p.milestoneCount ?? 0) > 0 && !projectMilestones[p._id]
    );
    for (const p of projectsWithMilestones) {
      fetchMilestones(p._id);
    }
  }, [projects]);

  function getStatus(statusId: string) {
    return statuses.find((s) => s._id === statusId) || { label: "Unknown", color: "#6b7280" };
  }

  async function fetchMilestones(projectId: string) {
    if (projectMilestones[projectId]) return;
    const res = await fetch(
      `/api/teams/${teamId}/roadmaps/${roadmapId}/projects/${projectId}/milestones`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      setProjectMilestones((prev) => ({ ...prev, [projectId]: data.milestones }));
    }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    setProjectError("");

    const res = await fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        statusId: projectStatusId,
        size: projectSize || null,
        pointEstimate: projectPoints ? Number(projectPoints) : null,
        plannedStart: projectStart,
        plannedEnd: projectEnd,
        leads: projectLeads,
        links: projectLinks.filter((l) => l.url.trim()),
      }),
    });

    if (res.ok) {
      setProjectTitle("");
      setProjectDescription("");
      setProjectStatusId("");
      setProjectSize("");
      setProjectPoints("");
      setProjectStart("");
      setProjectEnd("");
      setProjectLeads([]);
      setProjectLinks([]);
      setShowProjectForm(false);
      await fetchAll();
    } else {
      const data = await res.json();
      setProjectError(data.error || "Failed to create project");
    }
  }

  async function openAddExisting() {
    setShowAddExisting(true);
    const res = await fetch(`/api/teams/${teamId}/projects`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setAllTeamProjects(data.projects);
    }
  }

  async function handleAddExistingProject(projectId: string) {
    setAddingExisting(true);
    const res = await fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}/projects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    setAddingExisting(false);
    if (res.ok) {
      setShowAddExisting(false);
      await fetchAll();
    }
  }

  function startEditingRoadmap() {
    if (!roadmap) return;
    setRmTitle(roadmap.title);
    setRmStart(roadmap.startDate.split("T")[0]);
    setRmEnd(roadmap.endDate.split("T")[0]);
    setRmBudget(roadmap.budget?.toString() || "");
    setRmStatus(roadmap.status as "active" | "archived");
    setEditingRoadmap(true);
  }

  async function handleSaveRoadmap() {
    setRmSaving(true);
    const res = await fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: rmTitle.trim(),
        startDate: rmStart,
        endDate: rmEnd,
        budget: rmBudget ? Number(rmBudget) : null,
        status: rmStatus,
      }),
    });
    setRmSaving(false);
    if (res.ok) {
      setEditingRoadmap(false);
      await fetchAll();
    }
  }

  function addLinkRow() {
    setProjectLinks([...projectLinks, { label: "", url: "" }]);
  }

  function updateLink(index: number, field: "label" | "url", value: string) {
    const updated = [...projectLinks];
    updated[index] = { ...updated[index], [field]: value };
    setProjectLinks(updated);
  }

  function removeLink(index: number) {
    setProjectLinks(projectLinks.filter((_, i) => i !== index));
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
    const loadedMilestones = projectMilestones[p._id];
    const hasMilestones = (p.milestoneCount ?? 0) > 0 || (loadedMilestones && loadedMilestones.length > 0);

    let effectiveEndDate: string | undefined;
    if (loadedMilestones && loadedMilestones.length > 0) {
      const latestMilestoneEnd = loadedMilestones.reduce((latest, m) => {
        return m.plannedEnd > latest ? m.plannedEnd : latest;
      }, "");
      if (latestMilestoneEnd > p.plannedEnd) {
        effectiveEndDate = latestMilestoneEnd;
      }
    } else if (p.currentEndDate && p.currentEndDate > p.plannedEnd) {
      effectiveEndDate = p.currentEndDate;
    }

    return {
      _id: p._id,
      title: p.title,
      plannedStart: p.plannedStart,
      plannedEnd: p.plannedEnd,
      effectiveEndDate,
      statusColor: p.color || status.color,
      statusLabel: status.label,
      leads: p.leads,
      links: p.links,
      color: p.color,
      hasMilestones,
      milestones: loadedMilestones?.map((m) => {
        const mStatus = getStatus(m.statusId);
        return {
          _id: m._id,
          title: m.title,
          plannedStart: m.plannedStart,
          plannedEnd: m.plannedEnd,
          statusLabel: mStatus.label,
          statusColor: mStatus.color,
          assignee: m.assignee,
        };
      }),
    };
  });

  const capacityProjects = projects.flatMap((p) => {
    const status = getStatus(p.statusId);
    const loadedMilestones = projectMilestones[p._id];
    const hasMilestones = loadedMilestones && loadedMilestones.length > 0;

    if (hasMilestones) {
      return loadedMilestones
        .filter((m) => {
          return m.plannedEnd >= roadmap.startDate && m.plannedStart <= roadmap.endDate;
        })
        .map((m) => {
          const mStatus = getStatus(m.statusId);
          return {
            size: m.size,
            pointEstimate: m.pointEstimate,
            statusLabel: mStatus.label,
            statusColor: mStatus.color,
          };
        });
    }

    return [{
      size: p.size,
      pointEstimate: p.pointEstimate,
      statusLabel: status.label,
      statusColor: status.color,
    }];
  });

  const selectedProject = selectedProjectId
    ? projects.find((p) => p._id === selectedProjectId)
    : null;

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.push(`/teams/${teamId}`)}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{roadmap.title}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(roadmap.startDate)} –{" "}
                {formatDate(roadmap.endDate)} | {roadmap.estimationMode} mode
                {roadmap.status === "archived" && (
                  <span className="ml-2 bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                    Archived
                  </span>
                )}
              </p>
            </div>
            <Button variant="ghost-accent" size="sm" onClick={startEditingRoadmap}>
              <Pencil /> Edit
            </Button>
          </div>
        </div>

        <Modal open={editingRoadmap} onClose={() => setEditingRoadmap(false)} title="Edit Roadmap">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={rmTitle}
                onChange={(e) => setRmTitle(e.target.value)}
                className="mt-1 input-field"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={rmStart}
                  onChange={(e) => setRmStart(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className="mt-1 input-field cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={rmEnd}
                  onChange={(e) => setRmEnd(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className="mt-1 input-field cursor-pointer"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">
                  Budget ({roadmap.estimationMode === "points" ? "pts" : "units"})
                </label>
                <input
                  type="number"
                  value={rmBudget}
                  onChange={(e) => setRmBudget(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={rmStatus}
                  onChange={(e) => setRmStatus(e.target.value as "active" | "archived")}
                  className="mt-1 input-field"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveRoadmap} disabled={rmSaving || !rmTitle.trim() || !rmStart || !rmEnd}>
                {rmSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingRoadmap(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <div className="space-y-8">
          <CapacityOverview
            projects={capacityProjects}
            estimationMode={roadmap.estimationMode}
            budget={roadmap.budget}
            sizeWeights={sizingConfig?.sizes.map((s) => ({ label: s.label, weight: s.weight })) || []}
          />

          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h2 className="text-lg font-semibold">Timeline</h2>
              <Button variant="ghost-accent" size="sm" onClick={() => setGanttFullscreen(true)}>
                <Maximize2 /> Fullscreen
              </Button>
            </div>
            <GanttChart
              projects={ganttProjects}
              startDate={roadmap.startDate}
              endDate={roadmap.endDate}
              onExpandProject={fetchMilestones}
              highlightedId={hoveredProjectId}
              labelWidth="w-64"
            />
          </div>

          {ganttFullscreen && (
            <GanttFullscreen
              title={roadmap.title}
              projects={ganttProjects}
              startDate={roadmap.startDate}
              endDate={roadmap.endDate}
              onClose={() => setGanttFullscreen(false)}
            />
          )}

          {/* Project List */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
                {sizingConfig && sizingConfig.sizes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSizingRef(!showSizingRef)}
                    className={showSizingRef ? "text-primary" : "text-muted-foreground"}
                    title="Sizing reference"
                  >
                    <Info />
                  </Button>
                )}
              </div>
              {!showProjectForm && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost-accent" size="sm" onClick={openAddExisting}>Add Existing</Button>
                  <Button onClick={() => setShowProjectForm(true)}><Plus /> New Project</Button>
                </div>
              )}
            </div>

            {showSizingRef && sizingConfig && (
              <div className="mb-4 rounded-md border border-border bg-card p-3">
                <h3 className="text-sm font-medium mb-2">Sizing Reference</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="pb-1 pr-4">Size</th>
                      <th className="pb-1 pr-4">Points</th>
                      <th className="pb-1 pr-4">Weeks</th>
                      <th className="pb-1">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizingConfig.sizes.map((s) => (
                      <tr key={s.label} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-4 font-medium">{s.label}</td>
                        <td className="py-1.5 pr-4">{s.minPoints}–{s.maxPoints}</td>
                        <td className="py-1.5 pr-4">{s.weeksReference}</td>
                        <td className="py-1.5">{s.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showAddExisting && (
              <Modal open={showAddExisting} onClose={() => setShowAddExisting(false)} title="Add Existing Project">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {allTeamProjects
                    .filter((p) => !p.roadmapIds.includes(roadmapId))
                    .length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      All projects are already on this roadmap.
                    </p>
                  ) : (
                    allTeamProjects
                      .filter((p) => !p.roadmapIds.includes(roadmapId))
                      .map((p) => (
                        <button
                          key={p._id}
                          onClick={() => handleAddExistingProject(p._id)}
                          disabled={addingExisting}
                          className="w-full text-left px-3 py-2 rounded-md border border-border hover:bg-accent/30 transition-colors text-sm"
                        >
                          {p.title}
                        </button>
                      ))
                  )}
                </div>
              </Modal>
            )}

            {showProjectForm && (
              <form onSubmit={handleAddProject} className="rounded-md border border-border p-4 mb-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Project name"
                    className="mt-1 input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Brief description of scope, goals, or context"
                    rows={3}
                    className="mt-1 input-field resize-y"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={projectStatusId}
                      onChange={(e) => setProjectStatusId(e.target.value)}
                      className="mt-1 input-field"
                      required
                    >
                      <option value="">Select status...</option>
                      {statuses.map((s) => (
                        <option key={s._id} value={s._id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Size</label>
                    <select
                      value={projectSize}
                      onChange={(e) => setProjectSize(e.target.value)}
                      className="mt-1 input-field"
                    >
                      <option value="">None</option>
                      {sizingConfig?.sizes.map((s) => (
                        <option key={s.label} value={s.label}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {roadmap.estimationMode === "points" && (
                  <div>
                    <label className="text-sm font-medium">Story Points (optional)</label>
                    <input
                      type="number"
                      value={projectPoints}
                      onChange={(e) => setProjectPoints(e.target.value)}
                      placeholder="e.g. 8"
                      className="mt-1 input-field"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Assignee</label>
                  <select
                    value={projectLeads[0] || ""}
                    onChange={(e) => setProjectLeads(e.target.value ? [e.target.value] : [])}
                    className="mt-1 input-field"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Planned Start</label>
                    <input
                      type="date"
                      value={projectStart}
                      onChange={(e) => setProjectStart(e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      className="mt-1 input-field cursor-pointer"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Planned End</label>
                    <input
                      type="date"
                      value={projectEnd}
                      onChange={(e) => setProjectEnd(e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      className="mt-1 input-field cursor-pointer"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Links</label>
                    <button type="button" onClick={addLinkRow} className="text-xs text-muted-foreground hover:text-foreground">
                      + Add link
                    </button>
                  </div>
                  {projectLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(i, "label", e.target.value)}
                        placeholder="Label (optional)"
                        className="w-32 input-field"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(i, "url", e.target.value)}
                        placeholder="https://..."
                        className="flex-1 input-field"
                        required
                      />
                      <button type="button" onClick={() => removeLink(i)} className="text-xs text-muted-foreground hover:text-foreground px-2">
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                {projectError && (
                  <p className="text-sm text-destructive">{projectError}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={!projectTitle.trim() || !projectStatusId || !projectStart || !projectEnd}>
                    Add Project
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowProjectForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {projects.length === 0 && !showProjectForm ? (
              <p className="text-sm text-muted-foreground">
                No projects yet. Add your first project to this roadmap.
              </p>
            ) : (
              <div className="grid gap-2">
                {projects.map((project) => {
                  const status = getStatus(project.statusId);
                  const isSelected = selectedProjectId === project._id;
                  const loadedMs = projectMilestones[project._id];
                  let effectiveEnd: string | undefined;
                  if (loadedMs && loadedMs.length > 0) {
                    const latestMs = loadedMs.reduce((latest, m) => m.plannedEnd > latest ? m.plannedEnd : latest, "");
                    if (latestMs > project.plannedEnd) effectiveEnd = latestMs;
                  } else if (project.currentEndDate && project.currentEndDate > project.plannedEnd) {
                    effectiveEnd = project.currentEndDate;
                  }
                  return (
                    <div key={project._id}>
                      <div
                        className={`flex items-center justify-between rounded-md border p-3 cursor-pointer transition-colors ${
                          isSelected ? "border-ring bg-accent/50" : "border-border hover:bg-accent/30"
                        }`}
                        onClick={() => setSelectedProjectId(isSelected ? null : project._id)}
                        onMouseEnter={() => setHoveredProjectId(project._id)}
                        onMouseLeave={() => setHoveredProjectId(null)}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: project.color || status.color }}
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
                          {formatDate(project.plannedStart)} –{" "}
                          {formatDate(project.plannedEnd)}
                          {effectiveEnd && (
                            <span className="text-destructive/80"> → {formatDate(effectiveEnd)}</span>
                          )}
                        </span>
                      </div>
                      {isSelected && selectedProject && (
                        <ProjectDetail
                          project={selectedProject}
                          status={status}
                          teamId={teamId}
                          roadmapId={roadmapId}
                          statuses={statuses}
                          members={members}
                          sizingConfig={sizingConfig}
                          estimationMode={roadmap.estimationMode}
                          onUpdated={fetchAll}
                        />
                      )}
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

function ProjectDetail({
  project,
  status,
  teamId,
  roadmapId,
  statuses,
  members,
  sizingConfig,
  estimationMode,
  onUpdated,
}: {
  project: Project;
  status: { label: string; color: string };
  teamId: string;
  roadmapId: string;
  statuses: Status[];
  members: Member[];
  sizingConfig: SizingConfig | null;
  estimationMode: "points" | "sizes-only";
  onUpdated: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [statusId, setStatusId] = useState(project.statusId);
  const [size, setSize] = useState(project.size || "");
  const [points, setPoints] = useState(project.pointEstimate?.toString() || "");
  const [color, setColor] = useState(project.color || "#3b82f6");
  const [leads, setLeads] = useState<string[]>(project.leads || []);
  const [start, setStart] = useState(project.plannedStart.split("T")[0]);
  const [end, setEnd] = useState(project.plannedEnd.split("T")[0]);
  const [currentEnd, setCurrentEnd] = useState(project.currentEndDate?.split("T")[0] || "");
  const [links, setLinks] = useState<ProjectLink[]>(project.links || []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const res = await fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}/projects/${project._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        statusId,
        size: size || null,
        pointEstimate: points ? Number(points) : null,
        color,
        leads,
        plannedStart: start,
        plannedEnd: end,
        currentEndDate: currentEnd || null,
        links: links.filter((l) => l.url.trim()),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      await onUpdated();
    } else {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error || "Failed to save");
    }
  }

  function addLink() {
    setLinks([...links, { label: "", url: "" }]);
  }

  function updateLink(index: number, field: "label" | "url", value: string) {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  }

  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index));
  }

  const router = useRouter();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemoveFromRoadmap() {
    setRemoving(true);
    const res = await fetch(
      `/api/teams/${teamId}/roadmaps/${roadmapId}/projects/${project._id}/remove`,
      { method: "POST" }
    );
    setRemoving(false);
    if (res.ok) {
      setShowRemoveConfirm(false);
      await onUpdated();
    }
  }

  if (!editing) {
    return (
      <div className="border border-t-0 border-border rounded-b-md p-4 space-y-4 bg-accent/10">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/teams/${teamId}/projects/${project._id}`)} title="Open standalone project page">
            <ExternalLink />
          </Button>
          <Button variant="ghost-accent" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowRemoveConfirm(true)} className="text-destructive hover:text-destructive" title="Remove from this roadmap">
            <X />
          </Button>
        </div>

        {showRemoveConfirm && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm mb-2">
              Remove &ldquo;{project.title}&rdquo; from this roadmap? The project and its milestones will be preserved and can be added to another roadmap later.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRemoveFromRoadmap} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {removing ? "Removing..." : "Remove"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRemoveConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Status</span>
            <span className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              {status.label}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Size</span>
            <span className="mt-0.5">{project.size || "—"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Points</span>
            <span className="mt-0.5">{project.pointEstimate ?? "—"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Assignee</span>
            <span className="mt-0.5">{project.leads?.length ? project.leads.join(", ") : "Unassigned"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Planned Start</span>
            <span className="mt-0.5">{formatDate(project.plannedStart)}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Planned End</span>
            <span className="mt-0.5">{formatDate(project.plannedEnd)}</span>
          </div>
        </div>

        <div className="text-sm">
          <span className="text-xs text-muted-foreground block mb-1">Description</span>
          {project.description ? (
            <MarkdownContent content={project.description} />
          ) : (
            <p className="text-muted-foreground italic">No description</p>
          )}
        </div>

        <div className="text-sm">
          <span className="text-xs text-muted-foreground block mb-1">Links</span>
          {project.links && project.links.length > 0 ? (
            <div className="flex flex-col gap-1">
              {project.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {link.label || link.url}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No links</p>
          )}
        </div>

        <div className="pt-2 border-t border-border/50">
          <MilestoneManager
            teamId={teamId}
            roadmapId={roadmapId}
            projectId={project._id}
            statuses={statuses}
            members={members}
            estimationMode={estimationMode}
            sizes={sizingConfig?.sizes.map((s) => ({ label: s.label })) || []}
            onMilestoneChange={onUpdated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-t-0 border-border rounded-b-md p-4 space-y-3 bg-accent/10">
      <div>
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 input-field"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Bar Color</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {PROJECT_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-sm transition-all ${color === c ? "ring-2 ring-ring ring-offset-1 ring-offset-background scale-110" : "hover:scale-110"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded-sm border border-border cursor-pointer"
            title="Custom color"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <div className="mt-1">
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="Supports Markdown formatting"
            rows={5}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="mt-1 input-field"
          >
            {statuses.map((s) => (
              <option key={s._id} value={s._id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="mt-1 input-field"
          >
            <option value="">None</option>
            {sizingConfig?.sizes.map((s) => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Assignee</label>
        <select
          value={leads[0] || ""}
          onChange={(e) => setLeads(e.target.value ? [e.target.value] : [])}
          className="mt-1 input-field"
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m._id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>
      {estimationMode === "points" && (
        <div>
          <label className="text-sm font-medium">Story Points</label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1 input-field"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Planned Start</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            className="mt-1 input-field cursor-pointer"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Planned End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            className="mt-1 input-field cursor-pointer"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Current End Date</label>
        <p className="text-xs text-muted-foreground">Set when the project has slipped past its planned end. Shows as dashed overage on the Gantt.</p>
        <input
          type="date"
          value={currentEnd}
          onChange={(e) => setCurrentEnd(e.target.value)}
          onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
          min={end}
          className="mt-1 input-field cursor-pointer"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Links</label>
          <button type="button" onClick={addLink} className="text-xs text-muted-foreground hover:text-foreground">
            + Add link
          </button>
        </div>
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 mt-2">
            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(i, "label", e.target.value)}
              placeholder="Label"
              className="w-32 input-field"
            />
            <input
              type="url"
              value={link.url}
              onChange={(e) => updateLink(i, "url", e.target.value)}
              placeholder="https://..."
              className="flex-1 input-field"
            />
            <button type="button" onClick={() => removeLink(i)} className="text-xs text-muted-foreground hover:text-foreground px-2">
              &times;
            </button>
          </div>
        ))}
      </div>
      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function GanttFullscreen({
  title,
  projects,
  startDate,
  endDate,
  onClose,
}: {
  title: string;
  projects: { _id: string; title: string; plannedStart: string; plannedEnd: string; statusColor: string; statusLabel: string }[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold">{title} — Timeline</h1>
        <Button variant="ghost-accent" size="sm" onClick={onClose}>
          <Minimize2 /> Exit
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <GanttChart projects={projects} startDate={startDate} endDate={endDate} labelWidth="w-72" />
      </div>
    </div>
  );
}
