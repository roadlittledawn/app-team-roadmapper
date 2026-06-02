import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">Team Spaces</h1>
        <p className="mt-2 text-muted-foreground">
          Select a team space or create a new one.
        </p>
        <div className="mt-8 text-muted-foreground text-sm">
          No team spaces yet. Create your first one to get started.
        </div>
      </div>
    </div>
  );
}
