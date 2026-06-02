import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";
import { BacklogProject } from "@/models/backlog-project";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await Project.findOne({ _id: projectId, roadmapId, teamId }).lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await BacklogProject.create({
    title: project.title,
    description: project.description,
    size: project.size,
    pointEstimate: project.pointEstimate,
    leads: project.leads,
    teamId: project.teamId,
    milestones: project.milestones,
  });

  await Project.deleteOne({ _id: projectId });

  return NextResponse.json({ success: true });
}
