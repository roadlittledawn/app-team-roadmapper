import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  title: string;
  description: string;
  size: string | null;
  pointEstimate: number | null;
  statusId: mongoose.Types.ObjectId;
  plannedStart: Date;
  plannedEnd: Date;
  leads: string[];
  roadmapId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  milestones: string[];
  links: { label: string; url: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    size: { type: String, default: null },
    pointEstimate: { type: Number, default: null },
    statusId: { type: Schema.Types.ObjectId, ref: "ProjectStatus", required: true },
    plannedStart: { type: Date, required: true },
    plannedEnd: { type: Date, required: true },
    leads: [{ type: String }],
    roadmapId: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true },
    milestones: [{ type: String }],
    links: [{ label: { type: String, default: "" }, url: { type: String, required: true } }],
  },
  { timestamps: true }
);

ProjectSchema.index({ roadmapId: 1 });
ProjectSchema.index({ teamId: 1 });

export const Project =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
