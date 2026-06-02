import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { TeamMember } from "@/models/team-member";
import { Roadmap } from "@/models/roadmap";

async function verifyTeamOwnership(teamId: string, userId: string) {
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  return !!team;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const roadmaps = await Roadmap.find({ teamId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ roadmaps });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  const { title, startDate, endDate, estimationMode, budget } = await request.json();

  if (!title?.trim() || !startDate || !endDate || !estimationMode) {
    return NextResponse.json(
      { error: "title, startDate, endDate, and estimationMode are required" },
      { status: 400 }
    );
  }

  if (!["points", "sizes-only"].includes(estimationMode)) {
    return NextResponse.json({ error: "estimationMode must be 'points' or 'sizes-only'" }, { status: 400 });
  }

  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const existing = await Roadmap.findOne({ teamId, status: "active" }).lean();
  if (existing) {
    return NextResponse.json(
      { error: "An active roadmap already exists. Archive it first." },
      { status: 409 }
    );
  }

  const members = await TeamMember.find({ teamId }).lean();
  const roster = members.map((m) => ({
    memberId: m._id,
    name: m.name,
    role: m.role,
  }));

  const roadmap = await Roadmap.create({
    title: title.trim(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    estimationMode,
    budget: budget ?? null,
    status: "active",
    teamId,
    roster,
  });

  return NextResponse.json({ roadmap }, { status: 201 });
}
