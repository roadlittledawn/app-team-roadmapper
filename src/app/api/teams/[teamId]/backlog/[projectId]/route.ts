import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { BacklogProject } from "@/models/backlog-project";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const session = await requireAuth();
  const { teamId, projectId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const result = await BacklogProject.deleteOne({ _id: projectId, teamId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
