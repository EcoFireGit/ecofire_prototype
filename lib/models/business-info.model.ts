
import mongoose, { Schema, Document } from 'mongoose';

export interface BusinessInfo extends Document {
  userId: string;
  name: string;
  industry: string;
  missionStatement: string;
  monthsInBusiness: number;
  annualRevenue: number;
  growthStage: string;
}

const BusinessInfoSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    industry: { type: String, required: true },
    missionStatement: { type: String, required: true },
    monthsInBusiness: { type: Number, required: true },
    annualRevenue: { type: Number, required: true },
    growthStage: { type: String, required: true },
  },
  { timestamps: true }
);

// Create a unique index on userId to ensure only one record per user
BusinessInfoSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.BusinessInfo || mongoose.model<BusinessInfo>('BusinessInfo', BusinessInfoSchema);
