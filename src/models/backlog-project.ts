import mongoose, { Schema, Document } from "mongoose";

export interface IBacklogProject extends Document {
  title: string;
  description: string;
  size: string | null;
  pointEstimate: number | null;
  leads: mongoose.Types.ObjectId[];
  teamId: mongoose.Types.ObjectId;
  milestones: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BacklogProjectSchema = new Schema<IBacklogProject>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    size: { type: String, default: null },
    pointEstimate: { type: Number, default: null },
    leads: [{ type: Schema.Types.ObjectId, ref: "TeamMember" }],
    teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true },
    milestones: [{ type: String }],
  },
  { timestamps: true }
);

BacklogProjectSchema.index({ teamId: 1 });

export const BacklogProject =
  mongoose.models.BacklogProject ||
  mongoose.model<IBacklogProject>("BacklogProject", BacklogProjectSchema);
