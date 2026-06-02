import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { TeamMember } from "@/models/team-member";

async function verifyTeamOwnership(teamId: string, userId: string) {
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  return !!team;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const session = await requireAuth();
  const { teamId, memberId } = await params;
  const { name, role } = await request.json();

  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const update: Record<string, string> = {};
  if (name?.trim()) update.name = name.trim();
  if (role !== undefined) update.role = role.trim();

  const member = await TeamMember.findOneAndUpdate(
    { _id: memberId, teamId },
    update,
    { new: true }
  ).lean();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ member });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const session = await requireAuth();
  const { teamId, memberId } = await params;
  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const result = await TeamMember.deleteOne({ _id: memberId, teamId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
