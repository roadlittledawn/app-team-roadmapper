import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";
import { Milestone } from "@/models/milestone";
import { ProjectStatus } from "@/models/project-status";
import { deriveProjectStatus } from "@/lib/derive-project-status";

type Params = { teamId: string; roadmapId: string; projectId: string; milestoneId: string };

async function verifyAccess(teamId: string, roadmapId: string, projectId: string, userId: string) {
  await connectDB();
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  if (!team) return null;
  const project = await Project.findOne({ _id: projectId, roadmapIds: roadmapId, teamId }).lean();
  return project;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId, milestoneId } = await params;
  const body = await request.json();

  const project = await verifyAccess(teamId, roadmapId, projectId, session.userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.title) update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (body.statusId) update.statusId = body.statusId;
  if (body.assignee !== undefined) update.assignee = body.assignee;
  if (body.plannedStart) update.plannedStart = new Date(body.plannedStart);
  if (body.plannedEnd) update.plannedEnd = new Date(body.plannedEnd);
  if (body.size !== undefined) update.size = body.size || null;
  if (body.pointEstimate !== undefined) update.pointEstimate = body.pointEstimate != null ? Number(body.pointEstimate) : null;

  const milestone = await Milestone.findOneAndUpdate(
    { _id: milestoneId, projectId },
    update,
    { new: true }
  ).lean();

  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  await recalculateProjectStatus(projectId, teamId);

  return NextResponse.json({ milestone });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId, milestoneId } = await params;

  const project = await verifyAccess(teamId, roadmapId, projectId, session.userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await Milestone.deleteOne({ _id: milestoneId, projectId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  await recalculateProjectStatus(projectId, teamId);

  return NextResponse.json({ success: true });
}

async function recalculateProjectStatus(projectId: string, teamId: string) {
  const project = await Project.findById(projectId).lean();
  if (!project || project.statusOverride) return;

  const milestones = await Milestone.find({ projectId }).lean();
  if (milestones.length === 0) return;

  const statuses = await ProjectStatus.find({ teamId }).lean();
  const statusInfos = statuses.map((s) => ({ _id: s._id.toString(), label: s.label }));
  const derivedStatusId = deriveProjectStatus(milestones, statusInfos);

  if (derivedStatusId && derivedStatusId !== project.statusId.toString()) {
    await Project.updateOne({ _id: projectId }, { statusId: derivedStatusId });
  }

}
