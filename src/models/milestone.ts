import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  statusId: mongoose.Types.ObjectId;
  assignee: string;
  plannedStart: Date;
  plannedEnd: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    statusId: { type: Schema.Types.ObjectId, ref: "ProjectStatus", required: true },
    assignee: { type: String, default: "" },
    plannedStart: { type: Date, required: true },
    plannedEnd: { type: Date, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MilestoneSchema.index({ projectId: 1, order: 1 });

export const Milestone =
  mongoose.models.Milestone || mongoose.model<IMilestone>("Milestone", MilestoneSchema);
