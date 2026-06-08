import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Roadmap } from "@/models/roadmap";
import { Project, PROJECT_PALETTE } from "@/models/project";

async function verifyAccess(teamId: string, roadmapId: string, userId: string) {
  await connectDB();
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  if (!team) return null;
  const roadmap = await Roadmap.findOne({ _id: roadmapId, teamId }).lean();
  return roadmap;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId } = await params;

  const roadmap = await verifyAccess(teamId, roadmapId, session.userId);
  if (!roadmap) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const projects = await Project.find({ roadmapIds: roadmapId }).sort({ plannedStart: 1 }).lean();
  return NextResponse.json({ projects });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId } = await params;
  const body = await request.json();

  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const roadmap = await verifyAccess(teamId, roadmapId, session.userId);
  if (!roadmap) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = await Project.findOne({ _id: body.projectId, teamId });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.roadmapIds.some((id: { toString(): string }) => id.toString() === roadmapId)) {
    project.roadmapIds.push(roadmapId);
    await project.save();
  }

  return NextResponse.json({ project });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId } = await params;
  const body = await request.json();

  if (!body.title?.trim() || !body.statusId || !body.plannedStart || !body.plannedEnd) {
    return NextResponse.json(
      { error: "title, statusId, plannedStart, plannedEnd are required" },
      { status: 400 }
    );
  }

  const roadmap = await verifyAccess(teamId, roadmapId, session.userId);
  if (!roadmap) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingCount = await Project.countDocuments({ roadmapIds: roadmapId });
  const autoColor = PROJECT_PALETTE[existingCount % PROJECT_PALETTE.length];

  const project = await Project.create({
    title: body.title.trim(),
    description: body.description || "",
    size: body.size || null,
    pointEstimate: body.pointEstimate ?? null,
    color: body.color || autoColor,
    statusId: body.statusId,
    plannedStart: new Date(body.plannedStart),
    plannedEnd: new Date(body.plannedEnd),
    currentEndDate: body.currentEndDate ? new Date(body.currentEndDate) : null,
    leads: body.leads || [],
    roadmapIds: body.roadmapIds || [roadmapId],
    teamId,
    links: body.links || [],
  });

  return NextResponse.json({ project }, { status: 201 });
}
