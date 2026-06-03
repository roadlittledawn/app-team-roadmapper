import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { Project } from "@/models/project";
import { Milestone } from "@/models/milestone";

type Params = { teamId: string; roadmapId: string; projectId: string };

export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const session = await requireAuth();
  const { teamId, roadmapId, projectId } = await params;
  const { milestoneIds } = await request.json();

  if (!Array.isArray(milestoneIds) || milestoneIds.length === 0) {
    return NextResponse.json({ error: "milestoneIds array required" }, { status: 400 });
  }

  await connectDB();

  const team = await TeamSpace.findOne({ _id: teamId, userId: session.userId }).lean();
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await Project.findOne({ _id: projectId, roadmapIds: roadmapId, teamId }).lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const ops = milestoneIds.map((id: string, index: number) => ({
    updateOne: {
      filter: { _id: id, projectId },
      update: { order: index },
    },
  }));

  await Milestone.bulkWrite(ops);

  const milestones = await Milestone.find({ projectId }).sort({ order: 1 }).lean();
  return NextResponse.json({ milestones });
}
