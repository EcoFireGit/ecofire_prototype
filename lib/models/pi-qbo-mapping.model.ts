import mongoose from "mongoose";

export interface PIQBOMapping extends mongoose.Document {
  _id: string;
  piId: string;
  qboId: string;
  piName?: string;
  qboName?: string;
  piTarget: number;
  qboTarget: number;
  qboImpact: number;
  notes?: string;
  userId: string;
}

/* PIQBOMappingSchema will correspond to a collection in your MongoDB database. */
const PIQBOMappingSchema = new mongoose.Schema<PIQBOMapping>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true, // Add index for better query performance
  },
  piId: {
    type: String,
    required: [true, "PI ID is required"],
    index: true,
  },
  qboId: {
    type: String,
    required: [true, "QBO ID is required"],
    index: true,
  },
  piName: {
    type: String,
    required: false,
  },
  qboName: {
    type: String,
    required: false,
  },
  piTarget: {
    type: Number,
    required: [true, "Please provide a PI target value."],
  },
  qboTarget: {
    type: Number,
    required: [true, "Please provide a QBO target value."],
  },
  qboImpact: {
    type: Number,
    required: [true, "Please provide a QBO impact value."],
  },
  notes: {
    type: String,
    required: false,
  },
});

// Compound index to ensure one PI-QBO mapping per user
PIQBOMappingSchema.index({ userId: 1, piId: 1, qboId: 1 }, { unique: true });

export default mongoose.models.PIQBOMapping ||
  mongoose.model<PIQBOMapping>("PIQBOMapping", PIQBOMappingSchema);
