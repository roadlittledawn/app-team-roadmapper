import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";
import { Milestone } from "@/models/milestone";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const projects = await Project.find({ teamId }).sort({ plannedStart: 1 }).lean();

  const projectIds = projects.map((p) => p._id);
  const milestones = await Milestone.find({ projectId: { $in: projectIds } }).lean();

  const milestoneCounts: Record<string, number> = {};
  for (const m of milestones) {
    const pid = m.projectId.toString();
    milestoneCounts[pid] = (milestoneCounts[pid] || 0) + 1;
  }

  const projectsWithCounts = projects.map((p) => ({
    ...p,
    milestoneCount: milestoneCounts[p._id.toString()] || 0,
  }));

  return NextResponse.json({ projects: projectsWithCounts });
}
