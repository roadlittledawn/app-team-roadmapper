"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ArrowLeft, Pencil, Plus, UserPlus } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { timeZone: "UTC" });
}

interface Team {
  _id: string;
  name: string;
}

interface Member {
  _id: string;
  name: string;
  role: string;
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

interface SizeEntry {
  label: string;
  minPoints: number;
  maxPoints: number;
  weeksReference: string;
  weight: number;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [sizes, setSizes] = useState<SizeEntry[]>([]);
  const [editingSizes, setEditingSizes] = useState(false);
  const [draftSizes, setDraftSizes] = useState<SizeEntry[]>([]);
  const [sizeSaving, setSizeSaving] = useState(false);
  const [sizeError, setSizeError] = useState("");
  const [showRoadmapForm, setShowRoadmapForm] = useState(false);
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [roadmapStart, setRoadmapStart] = useState("");
  const [roadmapEnd, setRoadmapEnd] = useState("");
  const [roadmapMode, setRoadmapMode] = useState<"points" | "sizes-only">("points");
  const [roadmapBudget, setRoadmapBudget] = useState("");
  const [roadmapError, setRoadmapError] = useState("");

  useEffect(() => {
    fetchData();
  }, [teamId]);

  async function fetchData() {
    const [teamRes, membersRes, roadmapsRes, sizingRes] = await Promise.all([
      fetch(`/api/teams/${teamId}`),
      fetch(`/api/teams/${teamId}/members`),
      fetch(`/api/teams/${teamId}/roadmaps`),
      fetch(`/api/teams/${teamId}/sizing-config`),
    ]);

    if (teamRes.ok) {
      const data = await teamRes.json();
      setTeam(data.team);
    }
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members);
    }
    if (roadmapsRes.ok) {
      const data = await roadmapsRes.json();
      setRoadmaps(data.roadmaps);
    }
    if (sizingRes.ok) {
      const data = await sizingRes.json();
      setSizes(data.sizingConfig?.sizes || []);
    }
    setLoading(false);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMemberName.trim(), role: newMemberRole.trim() }),
    });

    if (res.ok) {
      setNewMemberName("");
      setNewMemberRole("");
      await fetchData();
    }
  }

  async function handleDeleteMember(memberId: string) {
    await fetch(`/api/teams/${teamId}/members/${memberId}`, { method: "DELETE" });
    await fetchData();
  }

  function openSizingEditor() {
    setDraftSizes(sizes.map((s) => ({ ...s })));
    setSizeError("");
    setEditingSizes(true);
  }

  function updateDraftSize(index: number, field: keyof SizeEntry, value: string | number) {
    const updated = [...draftSizes];
    updated[index] = { ...updated[index], [field]: value };
    setDraftSizes(updated);
  }

  function addDraftSize() {
    setDraftSizes([...draftSizes, { label: "", minPoints: 0, maxPoints: 10, weeksReference: "", weight: 1 }]);
  }

  function removeDraftSize(index: number) {
    setDraftSizes(draftSizes.filter((_, i) => i !== index));
  }

  async function handleSaveSizes() {
    setSizeError("");
    setSizeSaving(true);
    const res = await fetch(`/api/teams/${teamId}/sizing-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizes: draftSizes }),
    });
    setSizeSaving(false);
    if (res.ok) {
      setEditingSizes(false);
      await fetchData();
    } else {
      const data = await res.json();
      setSizeError(data.error || "Failed to save");
    }
  }

  async function handleCreateRoadmap(e: React.FormEvent) {
    e.preventDefault();
    setRoadmapError("");

    const res = await fetch(`/api/teams/${teamId}/roadmaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: roadmapTitle.trim(),
        startDate: roadmapStart,
        endDate: roadmapEnd,
        estimationMode: roadmapMode,
        budget: roadmapBudget ? Number(roadmapBudget) : null,
      }),
    });

    if (res.ok) {
      setRoadmapTitle("");
      setRoadmapStart("");
      setRoadmapEnd("");
      setRoadmapMode("points");
      setRoadmapBudget("");
      setShowRoadmapForm(false);
      await fetchData();
    } else {
      const data = await res.json();
      setRoadmapError(data.error || "Failed to create roadmap");
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Team not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft /> Back
          </Button>
          <h1 className="text-2xl font-bold">{team.name}</h1>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold pb-2 border-b border-border mb-4">Team Roster</h2>

          <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 input-field"
            />
            <input
              type="text"
              placeholder="Role (optional)"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="w-48 input-field"
            />
            <Button type="submit" disabled={!newMemberName.trim()}>
              <UserPlus /> Add
            </Button>
          </form>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <div className="grid gap-2">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted transition-colors"
                >
                  <div>
                    <span className="font-medium">{member.name}</span>
                    {member.role && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({member.role})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMember(member._id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between pb-2 border-b border-border mb-4">
            <h2 className="text-lg font-semibold">T-Shirt Sizes</h2>
            <Button variant="ghost-accent" size="sm" onClick={openSizingEditor}>
              <Pencil /> Edit
            </Button>
          </div>

          {sizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sizing config yet.</p>
          ) : (
            <div className="grid gap-2">
              {sizes.map((size) => (
                <div
                  key={size.label}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-sm w-8">{size.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {size.minPoints}–{size.maxPoints} pts
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ~{size.weeksReference} wks
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    weight: {size.weight}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Modal open={editingSizes} onClose={() => setEditingSizes(false)} title="Edit T-Shirt Sizes">
            <div className="space-y-3">
              {draftSizes.map((size, i) => (
                <div key={i} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Size {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeDraftSize(i)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Label</label>
                      <input
                        type="text"
                        value={size.label}
                        onChange={(e) => updateDraftSize(i, "label", e.target.value)}
                        placeholder="S, M, L..."
                        className="mt-0.5 input-field"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Weight</label>
                      <input
                        type="number"
                        value={size.weight}
                        onChange={(e) => updateDraftSize(i, "weight", Number(e.target.value))}
                        className="mt-0.5 input-field"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Min Points</label>
                      <input
                        type="number"
                        value={size.minPoints}
                        onChange={(e) => updateDraftSize(i, "minPoints", Number(e.target.value))}
                        className="mt-0.5 input-field"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Points</label>
                      <input
                        type="number"
                        value={size.maxPoints}
                        onChange={(e) => updateDraftSize(i, "maxPoints", Number(e.target.value))}
                        className="mt-0.5 input-field"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Weeks Reference</label>
                      <input
                        type="text"
                        value={size.weeksReference}
                        onChange={(e) => updateDraftSize(i, "weeksReference", e.target.value)}
                        placeholder="e.g. 3-5"
                        className="mt-0.5 input-field"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addDraftSize}
                className="w-full rounded-md border border-dashed border-border p-2 text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
              >
                + Add Size
              </button>

              {sizeError && (
                <p className="text-sm text-destructive">{sizeError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveSizes} disabled={sizeSaving || draftSizes.length === 0}>
                  {sizeSaving ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" onClick={() => setEditingSizes(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        </section>

        <section>
          <div className="flex items-center justify-between pb-2 border-b border-border mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Roadmaps</h2>
              <Button variant="ghost-accent" size="sm" onClick={() => router.push(`/teams/${teamId}/projects`)}>
                All Projects
              </Button>
            </div>
            {!showRoadmapForm && (
              <Button onClick={() => setShowRoadmapForm(true)}>
                <Plus /> New Roadmap
              </Button>
            )}
          </div>

          {showRoadmapForm && (
            <form onSubmit={handleCreateRoadmap} className="rounded-md border border-border p-4 mb-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={roadmapTitle}
                  onChange={(e) => setRoadmapTitle(e.target.value)}
                  placeholder="Q3 2026 Roadmap"
                  className="mt-1 input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={roadmapStart}
                    onChange={(e) => setRoadmapStart(e.target.value)}
                    className="mt-1 input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={roadmapEnd}
                    onChange={(e) => setRoadmapEnd(e.target.value)}
                    className="mt-1 input-field"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Estimation Mode</label>
                  <select
                    value={roadmapMode}
                    onChange={(e) => setRoadmapMode(e.target.value as "points" | "sizes-only")}
                    className="mt-1 input-field"
                  >
                    <option value="points">Points (T-shirt + story points)</option>
                    <option value="sizes-only">Sizes Only (weighted T-shirts)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Budget ({roadmapMode === "points" ? "pts" : "units"})
                  </label>
                  <input
                    type="number"
                    value={roadmapBudget}
                    onChange={(e) => setRoadmapBudget(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 input-field"
                  />
                </div>
              </div>
              {roadmapError && (
                <p className="text-sm text-destructive">{roadmapError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={!roadmapTitle.trim() || !roadmapStart || !roadmapEnd}>
                  Create Roadmap
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowRoadmapForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {roadmaps.length === 0 && !showRoadmapForm ? (
            <p className="text-sm text-muted-foreground">
              No roadmaps yet. Create one to start planning.
            </p>
          ) : (
            <div className="grid gap-2">
              {roadmaps.map((roadmap) => (
                <div
                  key={roadmap._id}
                  className="flex items-center justify-between rounded-md border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => router.push(`/teams/${teamId}/roadmaps/${roadmap._id}`)}
                >
                  <div>
                    <span className="font-medium">{roadmap.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {roadmap.estimationMode === "points" ? "Points" : "Sizes"}
                    </span>
                    {roadmap.status === "archived" && (
                      <span className="ml-2 text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                        Archived
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(roadmap.startDate)} –{" "}
                    {formatDate(roadmap.endDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
