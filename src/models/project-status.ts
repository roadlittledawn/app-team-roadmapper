import mongoose, { Schema, Document } from "mongoose";

export interface IProjectStatus extends Document {
  label: string;
  color: string;
  order: number;
  teamId: mongoose.Types.ObjectId;
}

const ProjectStatusSchema = new Schema<IProjectStatus>({
  label: { type: String, required: true },
  color: { type: String, required: true, default: "#6b7280" },
  order: { type: Number, required: true, default: 0 },
  teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true },
});

ProjectStatusSchema.index({ teamId: 1, order: 1 });

export const ProjectStatus =
  mongoose.models.ProjectStatus ||
  mongoose.model<IProjectStatus>("ProjectStatus", ProjectStatusSchema);

export const DEFAULT_STATUSES = [
  { label: "Draft", color: "#6b7280" },
  { label: "Needs Review", color: "#f59e0b" },
  { label: "Ready", color: "#3b82f6" },
  { label: "In Progress", color: "#8b5cf6" },
  { label: "Blocked", color: "#ef4444" },
  { label: "Done", color: "#10b981" },
];
