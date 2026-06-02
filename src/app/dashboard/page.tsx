"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";

interface Team {
  _id: string;
  name: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    const res = await fetch("/api/teams");
    if (res.ok) {
      const data = await res.json();
      setTeams(data.teams);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);

    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.ok) {
      setNewName("");
      await fetchTeams();
    }
    setCreating(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between pb-2 border-b border-border mb-8">
          <h1 className="text-2xl font-bold">Team Spaces</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut /> Sign out
          </Button>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="New team space name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 input-field"
          />
          <Button type="submit" disabled={creating || !newName.trim()}>
            <Plus /> {creating ? "Creating..." : "Create"}
          </Button>
        </form>

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No team spaces yet. Create your first one above.
          </p>
        ) : (
          <div className="grid gap-3">
            {teams.map((team) => (
              <button
                key={team._id}
                onClick={() => router.push(`/teams/${team._id}`)}
                className="flex items-center justify-between rounded-md border border-border p-4 text-left hover:bg-muted transition-colors"
              >
                <span className="font-medium">{team.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
