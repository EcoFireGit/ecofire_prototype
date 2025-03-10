// lib/models/qbo.model.ts
import mongoose from "mongoose";

export interface PIs extends mongoose.Document {
  _id: string;
  name: string;
  unit: string;
  beginningValue: number;
  targetValue: number;
  deadline: Date;
  notes?: string;
  userId: string;
}

/* PISchema will correspond to a collection in your MongoDB database. */
const PIsSchema = new mongoose.Schema<PIs>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true // Add index for better query performance
  },
  name: {
    type: String,
    required: [true, "Please provide a name for this PI."],
  },
  unit: {
    type: String,
    required: false,
  },
  beginningValue: {
    type: Number,
    required: [true, "Please provide a current value."],
    default: 0
  },
  targetValue: {
    type: Number,
    required: [true, "Please provide a target value."],
  },
  deadline: {
    type: Date,
    required: [true, "Please provide a deadline."],
  },
  notes: {
    type: String,
    required: false,
  }
});

export default mongoose.models.PI || mongoose.model<PIs>("PI", PIsSchema);