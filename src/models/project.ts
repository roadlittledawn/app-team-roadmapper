import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  title: string;
  description: string;
  size: string | null;
  pointEstimate: number | null;
  color: string;
  statusId: mongoose.Types.ObjectId;
  statusOverride: mongoose.Types.ObjectId | null;
  plannedStart: Date;
  plannedEnd: Date;
  targetEndDate: Date;
  leads: string[];
  roadmapIds: mongoose.Types.ObjectId[];
  teamId: mongoose.Types.ObjectId;
  links: { label: string; url: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export const PROJECT_PALETTE = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
  "#ec4899", "#f97316", "#14b8a6", "#6366f1", "#84cc16",
  "#e11d48", "#0ea5e9", "#a855f7", "#eab308", "#22d3ee",
];

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    size: { type: String, default: null },
    pointEstimate: { type: Number, default: null },
    color: { type: String, default: "#3b82f6" },
    statusId: { type: Schema.Types.ObjectId, ref: "ProjectStatus", required: true },
    statusOverride: { type: Schema.Types.ObjectId, ref: "ProjectStatus", default: null },
    plannedStart: { type: Date, required: true },
    plannedEnd: { type: Date, required: true },
    targetEndDate: { type: Date, required: true },
    leads: [{ type: String }],
    roadmapIds: [{ type: Schema.Types.ObjectId, ref: "Roadmap", required: true }],
    teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true },
    links: [{ label: { type: String, default: "" }, url: { type: String, required: true } }],
  },
  { timestamps: true }
);

ProjectSchema.index({ roadmapIds: 1 });
ProjectSchema.index({ teamId: 1 });

export const Project =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
