
import mongoose, { Schema } from "mongoose";

// Define the Mission schema
const missionSchema = new Schema({
  statement: {
    type: String,
    required: [true, "Mission statement is required"],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create or use the existing Mission model
export const Mission = mongoose.models.Mission || mongoose.model("Mission", missionSchema);
