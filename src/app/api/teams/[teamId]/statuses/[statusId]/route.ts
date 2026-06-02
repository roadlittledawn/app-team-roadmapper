import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { ProjectStatus } from "@/models/project-status";

async function verifyTeamOwnership(teamId: string, userId: string) {
  const team = await TeamSpace.findOne({ _id: teamId, userId }).lean();
  return !!team;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; statusId: string }> }
) {
  const session = await requireAuth();
  const { teamId, statusId } = await params;
  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const result = await ProjectStatus.deleteOne({ _id: statusId, teamId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Status not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
