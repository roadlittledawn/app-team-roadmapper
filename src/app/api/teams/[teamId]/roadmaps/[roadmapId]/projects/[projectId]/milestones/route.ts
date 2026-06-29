import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";
import { Milestone } from "@/models/milestone";
import { ProjectStatus } from "@/models/project-status";
import { deriveProjectStatus } from "@/lib/derive-project-status";

type Params = { teamId: string; roadmapId: string; projectId: string };

async function verifyProjectAccess(teamId: string, roadmapId: string, projectId: string, userId: string) {
  await connectDB();
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  if (!team) return null;
  const project = await Project.findOne({ _id: projectId, roadmapIds: roadmapId, teamId }).lean();
  return project;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;

  const project = await verifyProjectAccess(teamId, roadmapId, projectId, session.userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestones = await Milestone.find({ projectId }).sort({ order: 1 }).lean();
  return NextResponse.json({ milestones });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  const body = await request.json();

  if (!body.title?.trim() || !body.statusId || !body.plannedStart || !body.plannedEnd) {
    return NextResponse.json(
      { error: "title, statusId, plannedStart, plannedEnd are required" },
      { status: 400 }
    );
  }

  const project = await verifyProjectAccess(teamId, roadmapId, projectId, session.userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxOrder = await Milestone.findOne({ projectId }).sort({ order: -1 }).lean();
  const nextOrder = (maxOrder?.order ?? -1) + 1;

  const milestone = await Milestone.create({
    projectId,
    title: body.title.trim(),
    description: body.description || "",
    statusId: body.statusId,
    assignee: body.assignee || "",
    plannedStart: new Date(body.plannedStart),
    plannedEnd: new Date(body.plannedEnd),
    size: body.size || null,
    pointEstimate: body.pointEstimate != null ? Number(body.pointEstimate) : null,
    order: nextOrder,
  });

  await recalculateProjectStatus(projectId, teamId);

  return NextResponse.json({ milestone }, { status: 201 });
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
