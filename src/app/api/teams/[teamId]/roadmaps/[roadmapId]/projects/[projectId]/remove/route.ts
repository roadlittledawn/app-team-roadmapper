import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await Project.findOne({ _id: projectId, roadmapIds: roadmapId, teamId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  project.roadmapIds = project.roadmapIds.filter(
    (id: { toString(): string }) => id.toString() !== roadmapId
  );
  await project.save();

  return NextResponse.json({ success: true });
}
