import mongoose, { Schema, Document } from "mongoose";

export interface ITeamSpace extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSpaceSchema = new Schema<ITeamSpace>(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TeamSpaceSchema.index({ userId: 1 });

export const TeamSpace =
  mongoose.models.TeamSpace || mongoose.model<ITeamSpace>("TeamSpace", TeamSpaceSchema);
