import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { ProjectStatus, DEFAULT_STATUSES } from "@/models/project-status";

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

  let statuses = await ProjectStatus.find({ teamId }).sort({ order: 1 }).lean();

  if (statuses.length === 0) {
    const created = await ProjectStatus.insertMany(
      DEFAULT_STATUSES.map((s, i) => ({ ...s, order: i, teamId }))
    );
    statuses = created.map((s) => s.toObject());
  }

  return NextResponse.json({ statuses });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  const { label, color } = await request.json();

  if (!label?.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const maxOrder = await ProjectStatus.findOne({ teamId })
    .sort({ order: -1 })
    .select("order")
    .lean();

  const status = await ProjectStatus.create({
    label: label.trim(),
    color: color || "#6b7280",
    order: (maxOrder?.order ?? -1) + 1,
    teamId,
  });

  return NextResponse.json({ status }, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  const { statuses } = await request.json();

  if (!Array.isArray(statuses)) {
    return NextResponse.json({ error: "statuses array required" }, { status: 400 });
  }

  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const ops = statuses.map((s: { _id: string; label?: string; color?: string; order?: number }) =>
    ProjectStatus.findOneAndUpdate(
      { _id: s._id, teamId },
      { ...(s.label && { label: s.label }), ...(s.color && { color: s.color }), ...(s.order !== undefined && { order: s.order }) },
      { new: true }
    )
  );

  await Promise.all(ops);

  const updated = await ProjectStatus.find({ teamId }).sort({ order: 1 }).lean();
  return NextResponse.json({ statuses: updated });
}
