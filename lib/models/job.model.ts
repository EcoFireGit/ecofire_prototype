import mongoose from "mongoose";

export interface Jobs extends mongoose.Document {
  _id: string;
  title: string;
  notes: string;
  businessFunctionId: string;   
  userId: string;
  dueDate?: Date;
  createdDate?: Date;
  isDone: boolean;
  impact?: number;
  nextTaskId?: string; // Field to track the next task
  tasks?: string[]; // Array of task IDs associated with this job
  // owner field removed as it's now derived from the next task's owner
  isDeleted: boolean; // Soft delete flag
}

enum level {
    "High",
    "Medium",
    "Low"
} //to be used with the tasks feature, for adding a level of focus to each task

/* JobSchema will correspond to a collection in your MongoDB database. */
const JobSchema = new mongoose.Schema<Jobs>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true // Add index for better query performance
  },
  title: {
    type: String,
    required: [true, "Please provide a title for this Job."],
  },
  notes: {
    type: String,
    required: false,
  },
  businessFunctionId: {
    type: String, 
    required: false,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  createdDate: {
    type: Date,
    default: Date.now,
    required: false
  },
  isDone: {
    type: Boolean,
    default: false,
    required: true
  },
  impact: {
    type: Number,
    default: 0,
    required: false 
  },
  nextTaskId: {
    type: String,
    required: false
  },
  tasks: {
    type: [String],
    required: false,
    default: []
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  }
});

JobSchema.index({ title: 'text', notes: 'text'});

export default mongoose.models.Job || mongoose.model<Jobs>("Job", JobSchema);