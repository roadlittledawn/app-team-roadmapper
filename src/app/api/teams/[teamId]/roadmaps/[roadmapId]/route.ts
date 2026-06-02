import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Roadmap } from "@/models/roadmap";
import { Project } from "@/models/project";

async function verifyTeamOwnership(teamId: string, userId: string) {
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  return !!team;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId } = await params;
  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const roadmap = await Roadmap.findOne({ _id: roadmapId, teamId }).lean();
  if (!roadmap) {
    return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
  }

  const projects = await Project.find({ roadmapId }).sort({ plannedStart: 1 }).lean();

  return NextResponse.json({ roadmap, projects });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string; roadmapId: string }> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId } = await params;
  const body = await request.json();
  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (body.title) update.title = body.title.trim();
  if (body.startDate) update.startDate = new Date(body.startDate);
  if (body.endDate) update.endDate = new Date(body.endDate);
  if (body.budget !== undefined) update.budget = body.budget;
  if (body.status && ["active", "archived"].includes(body.status)) update.status = body.status;

  const roadmap = await Roadmap.findOneAndUpdate(
    { _id: roadmapId, teamId },
    update,
    { new: true }
  ).lean();

  if (!roadmap) {
    return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
  }

  return NextResponse.json({ roadmap });
}
