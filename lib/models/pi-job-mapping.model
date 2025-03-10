// lib/models/qbo.model.ts
import mongoose from "mongoose";

export interface JobPiMapping extends mongoose.Document {
  _id: string;
  jobId: string;
  piId: string;
  jobName: string;
  piName: string;
  piTarget: number;
  piImpactValue: number;
  notes?: string;
  userId: string;
}

/* PISchema will correspond to a collection in your MongoDB database. */
const MappingJobToPISchema = new mongoose.Schema<JobPiMapping>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true // Add index for better query performance
  },
  jobId: {
    type: String,
    required: [true, "Please provide the job you want to map to"],
  },
  piId: {
    type: String,
    required: true,
  },

    piName: {
    type: String,
    required: true,
    },

    jobName: {
    type: String,
    required: true,
    },
    piTarget: {
      type: Number,
      required: [true, "Please provide a PI target value."],
      default: 0
    },
  piImpactValue: {
    type: Number,
    required: [true, "Please provide a current value."],
    default: 0
  },
  notes: {
    type: String,
    required: false,
  }
});

export default mongoose.models.MappingJobToPI || mongoose.model<JobPiMapping>("MappingJobToPI", MappingJobToPISchema);