import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Roadmap } from "@/models/roadmap";
import { Project } from "@/models/project";
import { BacklogProject } from "@/models/backlog-project";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, projectId } = await params;
  const { roadmapId, statusId, plannedStart, plannedEnd } = await request.json();

  if (!roadmapId || !statusId || !plannedStart || !plannedEnd) {
    return NextResponse.json(
      { error: "roadmapId, statusId, plannedStart, plannedEnd required" },
      { status: 400 }
    );
  }

  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const roadmap = await Roadmap.findOne({ _id: roadmapId, teamId }).lean();
  if (!roadmap) return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });

  const backlogProject = await BacklogProject.findOne({ _id: projectId, teamId }).lean();
  if (!backlogProject) return NextResponse.json({ error: "Backlog project not found" }, { status: 404 });

  const project = await Project.create({
    title: backlogProject.title,
    description: backlogProject.description,
    size: backlogProject.size,
    pointEstimate: backlogProject.pointEstimate,
    statusId,
    plannedStart: new Date(plannedStart),
    plannedEnd: new Date(plannedEnd),
    leads: backlogProject.leads,
    roadmapId,
    teamId,
    milestones: backlogProject.milestones,
  });

  await BacklogProject.deleteOne({ _id: projectId });

  return NextResponse.json({ project }, { status: 201 });
}
