"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Team {
  _id: string;
  name: string;
}

interface Member {
  _id: string;
  name: string;
  role: string;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  useEffect(() => {
    fetchData();
  }, [teamId]);

  async function fetchData() {
    const [teamRes, membersRes] = await Promise.all([
      fetch(`/api/teams/${teamId}`),
      fetch(`/api/teams/${teamId}/members`),
    ]);

    if (teamRes.ok) {
      const data = await teamRes.json();
      setTeam(data.team);
    }
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members);
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
            &larr; Back
          </Button>
          <h1 className="text-2xl font-bold">{team.name}</h1>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Team Roster</h2>

          <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="Role (optional)"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" disabled={!newMemberName.trim()}>
              Add
            </Button>
          </form>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <div className="grid gap-2">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
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

        <section>
          <h2 className="text-lg font-semibold mb-4">Roadmaps</h2>
          <p className="text-sm text-muted-foreground">
            No roadmaps yet. This will be implemented in the next phase.
          </p>
        </section>
      </div>
    </div>
  );
}
