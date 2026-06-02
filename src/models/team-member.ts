import mongoose, { Schema, Document } from "mongoose";

export interface ITeamMember extends Document {
  name: string;
  role: string;
  teamId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true },
    role: { type: String, default: "" },
    teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true },
  },
  { timestamps: true }
);

TeamMemberSchema.index({ teamId: 1 });

export const TeamMember =
  mongoose.models.TeamMember || mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);
