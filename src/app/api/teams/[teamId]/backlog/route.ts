import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { BacklogProject } from "@/models/backlog-project";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const projects = await BacklogProject.find({ teamId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ projects });
}
