import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";
import { Milestone } from "@/models/milestone";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await Project.findOne({ _id: projectId, teamId }).lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const milestones = await Milestone.find({ projectId }).sort({ order: 1 }).lean();

  return NextResponse.json({ project, milestones });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, projectId } = await params;
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
  if (body.currentEndDate !== undefined) update.currentEndDate = body.currentEndDate ? new Date(body.currentEndDate) : null;
  if (body.color) update.color = body.color;
  if (body.leads) update.leads = body.leads;
  if (body.roadmapIds) update.roadmapIds = body.roadmapIds;
  if (body.links !== undefined) update.links = body.links;

  const project = await Project.findOneAndUpdate(
    { _id: projectId, teamId },
    update,
    { new: true }
  ).lean();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await Project.deleteOne({ _id: projectId, teamId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await Milestone.deleteMany({ projectId });

  return NextResponse.json({ success: true });
}
