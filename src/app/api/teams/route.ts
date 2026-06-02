import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamSpace } from "@/models/team-space";

export async function GET() {
  const session = await requireAuth();
  await connectDB();

  const teams = await TeamSpace.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const session = await requireAuth();
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectDB();

  const team = await TeamSpace.create({
    name: name.trim(),
    userId: session.userId,
  });

  return NextResponse.json({ team }, { status: 201 });
}
