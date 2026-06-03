"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Milestone {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  assignee: string;
  plannedStart: string;
  plannedEnd: string;
  order: number;
}

interface Status {
  _id: string;
  label: string;
  color: string;
}

interface Member {
  _id: string;
  name: string;
}

interface MilestoneManagerProps {
  teamId: string;
  roadmapId: string;
  projectId: string;
  statuses: Status[];
  members: Member[];
  onMilestoneChange?: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
}

export function MilestoneManager({
  teamId,
  roadmapId,
  projectId,
  statuses,
  members,
  onMilestoneChange,
}: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const baseUrl = `/api/teams/${teamId}/roadmaps/${roadmapId}/projects/${projectId}/milestones`;

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  async function fetchMilestones() {
    const res = await fetch(baseUrl, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMilestones(data.milestones);
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatusId("");
    setAssignee("");
    setPlannedStart("");
    setPlannedEnd("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(m: Milestone) {
    setTitle(m.title);
    setDescription(m.description || "");
    setStatusId(m.statusId);
    setAssignee(m.assignee || "");
    setPlannedStart(m.plannedStart.split("T")[0]);
    setPlannedEnd(m.plannedEnd.split("T")[0]);
    setEditingId(m._id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      statusId,
      assignee,
      plannedStart,
      plannedEnd,
    };

    let res: Response;
    if (editingId) {
      res = await fetch(`${baseUrl}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    if (res.ok) {
      resetForm();
      await fetchMilestones();
      onMilestoneChange?.();
    }
  }

  async function handleDelete(milestoneId: string) {
    const res = await fetch(`${baseUrl}/${milestoneId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchMilestones();
      onMilestoneChange?.();
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading milestones...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          Milestones ({milestones.length})
        </span>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="space-y-1.5">
          {milestones.map((m) => {
            const mStatus = statuses.find((s) => s._id === m.statusId);
            return (
              <div
                key={m._id}
                className="flex items-center justify-between rounded border border-border/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: mStatus?.color || "#6b7280" }}
                  />
                  <span className="truncate">{m.title}</span>
                  {m.assignee && (
                    <span className="text-xs text-muted-foreground shrink-0">• {m.assignee}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(m.plannedStart)} – {formatDate(m.plannedEnd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m._id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded border border-border p-3 space-y-2">
          <div>
            <label className="text-xs font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone name"
              className="mt-0.5 input-field text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="mt-0.5 input-field text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Status</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="mt-0.5 input-field text-sm"
                required
              >
                <option value="">Select...</option>
                {statuses.map((s) => (
                  <option key={s._id} value={s._id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="mt-0.5 input-field text-sm"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m._id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Start</label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="mt-0.5 input-field text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium">End</label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="mt-0.5 input-field text-sm"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving || !title.trim() || !statusId || !plannedStart || !plannedEnd}>
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
