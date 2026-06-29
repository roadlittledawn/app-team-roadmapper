"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MilestoneManager } from "@/components/milestone-manager";
import { MarkdownContent } from "@/components/markdown-content";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";

const PROJECT_PALETTE = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
  "#ec4899", "#f97316", "#14b8a6", "#6366f1", "#84cc16",
  "#e11d48", "#0ea5e9", "#a855f7", "#eab308", "#22d3ee",
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
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
  color: string;
  plannedStart: string;
  plannedEnd: string;
  currentEndDate?: string | null;
  statusId: string;
  statusOverride?: string | null;
  leads: string[];
  links: ProjectLink[];
  roadmapIds: string[];
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

interface RoadmapInfo {
  _id: string;
  title: string;
}

interface SizeEntry {
  label: string;
  weight: number;
}

interface SizingConfig {
  sizes: SizeEntry[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapInfo[]>([]);
  const [sizingConfig, setSizingConfig] = useState<SizingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [size, setSize] = useState("");
  const [points, setPoints] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [leads, setLeads] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [currentEnd, setCurrentEnd] = useState("");
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [teamId, projectId]);

  async function fetchAll() {
    const [projRes, statusRes, membersRes, roadmapRes, sizingRes] = await Promise.all([
      fetch(`/api/teams/${teamId}/projects/${projectId}`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/statuses`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/members`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/roadmaps`, { cache: "no-store" }),
      fetch(`/api/teams/${teamId}/sizing-config`, { cache: "no-store" }),
    ]);

    if (projRes.ok) {
      const data = await projRes.json();
      setProject(data.project);
    }
    if (statusRes.ok) {
      const data = await statusRes.json();
      setStatuses(data.statuses);
    }
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members);
    }
    if (roadmapRes.ok) {
      const data = await roadmapRes.json();
      setRoadmaps(data.roadmaps);
    }
    if (sizingRes.ok) {
      const data = await sizingRes.json();
      setSizingConfig(data.sizingConfig);
    }
    setLoading(false);
  }

  function getStatus(sid: string) {
    return statuses.find((s) => s._id === sid) || { label: "Unknown", color: "#6b7280" };
  }

  function startEditing() {
    if (!project) return;
    setTitle(project.title);
    setDescription(project.description || "");
    setStatusId(project.statusId);
    setSize(project.size || "");
    setPoints(project.pointEstimate?.toString() || "");
    setColor(project.color || "#3b82f6");
    setLeads(project.leads || []);
    setStart(project.plannedStart.split("T")[0]);
    setEnd(project.plannedEnd.split("T")[0]);
    setCurrentEnd(project.currentEndDate?.split("T")[0] || "");
    setLinks(project.links || []);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const res = await fetch(`/api/teams/${teamId}/projects/${projectId}`, {
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
      await fetchAll();
    } else {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error || "Failed to save");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/teams/${teamId}/projects/${projectId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push(`/teams/${teamId}/projects`);
    }
    setDeleting(false);
  }

  async function handleRemoveFromRoadmap(roadmapId: string) {
    const res = await fetch(
      `/api/teams/${teamId}/roadmaps/${roadmapId}/projects/${projectId}/remove`,
      { method: "POST" }
    );
    if (res.ok) {
      await fetchAll();
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const status = getStatus(project.statusId);
  const projectRoadmaps = roadmaps.filter((r) => project.roadmapIds.includes(r._id));

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.push(`/teams/${teamId}/projects`)}>
            <ArrowLeft /> All Projects
          </Button>
        </div>

        {!editing ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <h1 className="text-2xl font-bold">{project.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost-accent" size="sm" onClick={startEditing}>
                  <Pencil /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive">
                  <Trash2 />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Planned Start</span>
                <span className="mt-0.5">{formatDate(project.plannedStart)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Planned End</span>
                <span className="mt-0.5">{formatDate(project.plannedEnd)}</span>
              </div>
              {project.currentEndDate && (
                <div>
                  <span className="text-xs text-muted-foreground block">Current End</span>
                  <span className="mt-0.5 text-destructive">{formatDate(project.currentEndDate)}</span>
                </div>
              )}
            </div>

            <div className="text-sm">
              <span className="text-xs text-muted-foreground block mb-1">Roadmaps</span>
              {projectRoadmaps.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {projectRoadmaps.map((r) => (
                    <button
                      key={r._id}
                      onClick={() => router.push(`/teams/${teamId}/roadmaps/${r._id}`)}
                      className="text-xs bg-accent border border-border rounded px-2 py-1 hover:bg-accent/80 transition-colors"
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Not on any roadmap</p>
              )}
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

            <div className="pt-4 border-t border-border">
              <MilestoneManager
                teamId={teamId}
                roadmapId={project.roadmapIds[0] || ""}
                projectId={project._id}
                statuses={statuses}
                members={members}
                estimationMode="points"
                sizes={sizingConfig?.sizes.map((s) => ({ label: s.label })) || []}
                onMilestoneChange={fetchAll}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="text-sm font-medium">Story Points</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 input-field"
                />
              </div>
            </div>
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
              <p className="text-xs text-muted-foreground">Set when the project has slipped past its planned end.</p>
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
              <label className="text-sm font-medium">Roadmaps</label>
              <div className="mt-1">
                {projectRoadmaps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {projectRoadmaps.map((r) => (
                      <span
                        key={r._id}
                        className="inline-flex items-center gap-1 text-xs bg-accent border border-border rounded px-2 py-1"
                      >
                        {r.title}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromRoadmap(r._id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove from this roadmap"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Not on any roadmap</p>
                )}
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
        )}

        <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Project">
          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete &ldquo;{project.title}&rdquo; and all its milestones. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
