// lib/models/organization.model.ts
import mongoose, { Schema } from "mongoose";

export interface Organization extends mongoose.Document {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean; // Soft delete flag
  deletedAt: Date;
}

const organizationSchema = new Schema<Organization>(
  {
    name: { type: String, required: true },
    description: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// Prevent duplicate model initialization
export default mongoose.models.Organization ||
  mongoose.model<Organization>("Organization", organizationSchema);

