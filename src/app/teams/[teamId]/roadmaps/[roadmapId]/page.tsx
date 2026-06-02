"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GanttChart } from "@/components/gantt-chart";
import { CapacityOverview } from "@/components/capacity-overview";

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

interface Project {
  _id: string;
  title: string;
  description: string;
  size: string | null;
  pointEstimate: number | null;
  plannedStart: string;
  plannedEnd: string;
  statusId: string;
  leads: string[];
  links: ProjectLink[];
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
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatusId, setProjectStatusId] = useState("");
  const [projectSize, setProjectSize] = useState("");
  const [projectPoints, setProjectPoints] = useState("");
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [projectError, setProjectError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
      setProjectLinks([]);
      setShowProjectForm(false);
      await fetchAll();
    } else {
      const data = await res.json();
      setProjectError(data.error || "Failed to create project");
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

  const selectedProject = selectedProjectId
    ? projects.find((p) => p._id === selectedProjectId)
    : null;

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
              {formatDate(roadmap.startDate)} –{" "}
              {formatDate(roadmap.endDate)} | {roadmap.estimationMode} mode
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <CapacityOverview
            projects={capacityProjects}
            estimationMode={roadmap.estimationMode}
            budget={roadmap.budget}
            sizeWeights={sizingConfig?.sizes.map((s) => ({ label: s.label, weight: s.weight })) || []}
          />

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
              {!showProjectForm && (
                <Button onClick={() => setShowProjectForm(true)}>Add Project</Button>
              )}
            </div>

            {showProjectForm && (
              <form onSubmit={handleAddProject} className="rounded-md border border-border p-4 mb-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Project name"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={projectStatusId}
                      onChange={(e) => setProjectStatusId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Planned Start</label>
                    <input
                      type="date"
                      value={projectStart}
                      onChange={(e) => setProjectStart(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Planned End</label>
                    <input
                      type="date"
                      value={projectEnd}
                      onChange={(e) => setProjectEnd(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                        className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(i, "url", e.target.value)}
                        placeholder="https://..."
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                      <button type="button" onClick={() => removeLink(i)} className="text-xs text-muted-foreground hover:text-foreground px-2">
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                {projectError && (
                  <p className="text-sm text-red-500">{projectError}</p>
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
                  return (
                    <div key={project._id}>
                      <div
                        className={`flex items-center justify-between rounded-md border p-3 cursor-pointer transition-colors ${
                          isSelected ? "border-ring bg-accent/50" : "border-border hover:bg-accent/30"
                        }`}
                        onClick={() => setSelectedProjectId(isSelected ? null : project._id)}
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
                          {formatDate(project.plannedStart)} –{" "}
                          {formatDate(project.plannedEnd)}
                        </span>
                      </div>
                      {isSelected && selectedProject && (
                        <ProjectDetail
                          project={selectedProject}
                          status={status}
                          teamId={teamId}
                          roadmapId={roadmapId}
                          statuses={statuses}
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
  sizingConfig,
  estimationMode,
  onUpdated,
}: {
  project: Project;
  status: { label: string; color: string };
  teamId: string;
  roadmapId: string;
  statuses: Status[];
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
  const [start, setStart] = useState(project.plannedStart.split("T")[0]);
  const [end, setEnd] = useState(project.plannedEnd.split("T")[0]);
  const [links, setLinks] = useState<ProjectLink[]>(project.links || []);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/teams/${teamId}/roadmaps/${roadmapId}/projects/${project._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        statusId,
        size: size || null,
        pointEstimate: points ? Number(points) : null,
        plannedStart: start,
        plannedEnd: end,
        links: links.filter((l) => l.url.trim()),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      await onUpdated();
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

  if (!editing) {
    return (
      <div className="border border-t-0 border-border rounded-b-md p-4 space-y-3 bg-accent/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
            <span className="text-sm font-medium">{status.label}</span>
            {project.size && <span className="text-xs border border-border rounded px-1.5 py-0.5">{project.size}</span>}
            {project.pointEstimate && <span className="text-xs text-muted-foreground">{project.pointEstimate} pts</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDate(project.plannedStart)} – {formatDate(project.plannedEnd)}
        </div>
        {project.description && (
          <p className="text-sm whitespace-pre-wrap">{project.description}</p>
        )}
        {project.links && project.links.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Links</span>
            <div className="flex flex-col gap-1">
              {project.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline truncate"
                >
                  {link.label || link.url}
                </a>
              ))}
            </div>
          </div>
        )}
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
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">None</option>
            {sizingConfig?.sizes.map((s) => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      {estimationMode === "points" && (
        <div>
          <label className="text-sm font-medium">Story Points</label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Planned End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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
              className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="url"
              value={link.url}
              onChange={(e) => updateLink(i, "url", e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="button" onClick={() => removeLink(i)} className="text-xs text-muted-foreground hover:text-foreground px-2">
              &times;
            </button>
          </div>
        ))}
      </div>
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
