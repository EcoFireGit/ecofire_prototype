// lib/models/userOrganization.model.ts
import mongoose, { Schema } from 'mongoose';

export interface UserOrganization extends mongoose.Document {
  userId: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

const userOrganizationSchema = new Schema<UserOrganization>(
  {
    userId: { type: String, required: true },
    organizationId: { type: String, required: true },
    email: { type: String },
    role: { 
      type: String, 
      enum: ['admin', 'member'], 
      default: 'member' 
    },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Add compound index to ensure a user can only be added to an org once
userOrganizationSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export default mongoose.models.UserOrganization || 
  mongoose.model<UserOrganization>('UserOrganization', userOrganizationSchema);