// lib/models/organization.model.ts
import mongoose, { Schema } from "mongoose";

export interface InviteUser extends mongoose.Document {
  _id: string;
  email: string;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  hasAccepted?: boolean; // Soft delete flag
}

const inviteUserSchema = new Schema<InviteUser>(
  {
    email: { type: String, required: true },
    organizationId: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    hasAccepted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Prevent duplicate model initialization
export default mongoose.models.InviteUser ||
  mongoose.model<InviteUser>("InviteUsers", inviteUserSchema);

