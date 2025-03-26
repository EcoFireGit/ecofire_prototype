// lib/models/task-tag.model.ts
import mongoose from "mongoose";

export interface TaskTag extends mongoose.Document {
  _id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTagSchema = new mongoose.Schema<TaskTag>(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true, // Add index for better query performance
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound unique index on userId and name
TaskTagSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.TaskTag || mongoose.model<TaskTag>("TaskTag", TaskTagSchema);