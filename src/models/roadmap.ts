import mongoose, { Schema, Document } from "mongoose";

export interface IRoadmapRosterMember {
  memberId: mongoose.Types.ObjectId;
  name: string;
  role: string;
}

export interface IRoadmap extends Document {
  title: string;
  startDate: Date;
  endDate: Date;
  estimationMode: "points" | "sizes-only";
  budget: number | null;
  status: "active" | "archived";
  teamId: mongoose.Types.ObjectId;
  roster: IRoadmapRosterMember[];
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapRosterMemberSchema = new Schema<IRoadmapRosterMember>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "TeamMember", required: true },
    name: { type: String, required: true },
    role: { type: String, default: "" },
  },
  { _id: false }
);

const RoadmapSchema = new Schema<IRoadmap>(
  {
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    estimationMode: { type: String, enum: ["points", "sizes-only"], required: true },
    budget: { type: Number, default: null },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true },
    roster: { type: [RoadmapRosterMemberSchema], default: [] },
  },
  { timestamps: true }
);

RoadmapSchema.index({ teamId: 1, status: 1 });

export const Roadmap =
  mongoose.models.Roadmap || mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
