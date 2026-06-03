import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await Project.findOne({ _id: projectId, roadmapIds: roadmapId, teamId }).lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  const body = await request.json();
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.title) update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (body.size !== undefined) update.size = body.size;
  if (body.pointEstimate !== undefined) update.pointEstimate = body.pointEstimate;
  if (body.statusId) update.statusId = body.statusId;
  if (body.statusOverride !== undefined) update.statusOverride = body.statusOverride;
  if (body.plannedStart) update.plannedStart = new Date(body.plannedStart);
  if (body.plannedEnd) update.plannedEnd = new Date(body.plannedEnd);
  if (body.targetEndDate) update.targetEndDate = new Date(body.targetEndDate);
  if (body.color) update.color = body.color;
  if (body.leads) update.leads = body.leads;
  if (body.roadmapIds) update.roadmapIds = body.roadmapIds;
  if (body.links !== undefined) update.links = body.links;

  const project = await Project.findOneAndUpdate(
    { _id: projectId, roadmapIds: roadmapId, teamId },
    update,
    { new: true }
  ).lean();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await Project.deleteOne({ _id: projectId, roadmapIds: roadmapId, teamId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
