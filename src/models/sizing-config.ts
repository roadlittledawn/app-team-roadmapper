import mongoose, { Schema, Document } from "mongoose";

export interface ISizeEntry {
  label: string;
  minPoints: number;
  maxPoints: number;
  weeksReference: string;
  weight: number;
}

export interface ISizingConfig extends Document {
  teamId: mongoose.Types.ObjectId;
  sizes: ISizeEntry[];
}

const SizeEntrySchema = new Schema<ISizeEntry>(
  {
    label: { type: String, required: true },
    minPoints: { type: Number, required: true },
    maxPoints: { type: Number, required: true },
    weeksReference: { type: String, required: true },
    weight: { type: Number, required: true },
  },
  { _id: false }
);

const SizingConfigSchema = new Schema<ISizingConfig>({
  teamId: { type: Schema.Types.ObjectId, ref: "TeamSpace", required: true, unique: true },
  sizes: { type: [SizeEntrySchema], required: true },
});

export const SizingConfig =
  mongoose.models.SizingConfig ||
  mongoose.model<ISizingConfig>("SizingConfig", SizingConfigSchema);

export const DEFAULT_SIZES: ISizeEntry[] = [
  { label: "S", minPoints: 1, maxPoints: 12, weeksReference: "1-2", weight: 1 },
  { label: "M", minPoints: 13, maxPoints: 25, weeksReference: "3-5", weight: 2 },
  { label: "L", minPoints: 26, maxPoints: 50, weeksReference: "6-10", weight: 4 },
  { label: "XL", minPoints: 51, maxPoints: 100, weeksReference: "11-16", weight: 8 },
];
