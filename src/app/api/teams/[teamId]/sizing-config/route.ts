import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";
import { SizingConfig, DEFAULT_SIZES } from "@/models/sizing-config";

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

  let config = await SizingConfig.findOne({ teamId }).lean();

  if (!config) {
    config = (await SizingConfig.create({ teamId, sizes: DEFAULT_SIZES })).toObject();
  }

  return NextResponse.json({ sizingConfig: config });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAuth();
  const { teamId } = await params;
  const { sizes } = await request.json();

  if (!Array.isArray(sizes) || sizes.length === 0) {
    return NextResponse.json({ error: "sizes array required" }, { status: 400 });
  }

  for (const size of sizes) {
    if (!size.label || size.minPoints == null || size.maxPoints == null || !size.weeksReference || size.weight == null) {
      return NextResponse.json({ error: "Each size needs label, minPoints, maxPoints, weeksReference, weight" }, { status: 400 });
    }
    if (size.maxPoints - size.minPoints < 2) {
      return NextResponse.json({ error: `Range for ${size.label} must be at least 3 points wide` }, { status: 400 });
    }
  }

  await connectDB();

  if (!(await verifyTeamOwnership(teamId, session.userId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const config = await SizingConfig.findOneAndUpdate(
    { teamId },
    { sizes },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json({ sizingConfig: config });
}
