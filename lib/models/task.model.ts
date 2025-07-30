import mongoose from "mongoose";
export enum FocusLevel {
  High = "High",
  Medium = "Medium",
  Low = "Low",
  None = "none"
}
export enum JoyLevel {
  High = "High",
  Medium = "Medium",
  Low = "Low",
  None = "none"
}
export enum RecurrenceInterval {
  Daily = "daily",
  Weekly = "weekly",
  Biweekly = "biweekly",
  Monthly = "monthly",
  Quarterly = "quarterly",
  Annually = "annually"
}
export interface Task extends mongoose.Document {
  _id: string;
  title: string;
  owner?: string;
  date?: Date;
  requiredHours?: number;
  focusLevel?: FocusLevel;
  joyLevel?: JoyLevel;
  notes?: string;
  tags?: string[];
  jobId: string;
  userId: string;
  completed: boolean;
  isDeleted: boolean; // Soft delete flag
  createdDate: Date;
  endDate?: Date | null;
  timeElapsed?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  // nextTask: boolean; // New property to mark task as next
}
const TaskSchema = new mongoose.Schema<Task>({
  title: {
    type: String,
    required: [true, "Please provide a title for this Task."],
  },
  owner: {
    type: String,
    required: false,
  },
  date: {
    type: Date,
    required: false,
  },
  requiredHours: {
    type: Number,
    default: 0,
    set: (v: number | null) => v == null ? 0 : v,    
    required: false,
  },
  focusLevel: {
    type: String,
    enum: Object.values(FocusLevel),
    default: FocusLevel.None,
    required: false,
  },
  joyLevel: {
    type: String,
    enum: Object.values(JoyLevel),
    default: JoyLevel.None,
    required: false,
  },
  notes: {
    type: String,
    required: false,
  },
  tags: {
    type: [String],
    default: [],
    required: false,
  },
  jobId: {
    type: String,
    required: [true, "Job ID is required"],
    index: true
  },
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true
  },
  completed: {
    type: Boolean,
    default: false,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  },  // nextTask: {
  //   type: Boolean,
  //   default: false,
  //   required: true
  // }
  createdDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date,
    required: false,
    default: null
  },
  timeElapsed: {
    type: String,
    required: false,
    default: null
  },
  isRecurring: {
    type: Boolean,
    required: false,
    default: false
  },
  recurrenceInterval: {
    type: String,
    enum: Object.values(RecurrenceInterval),
    required: false,
    default: undefined
  },
});

// Create a compound index to ensure only one task per job is marked as next
TaskSchema.index({ jobId: 1, nextTask: 1 }, { 
  unique: true,
  partialFilterExpression: { nextTask: true }
});

TaskSchema.index({ title: 'text', notes: 'text', tags: 'text' });

export default mongoose.models.Task || mongoose.model<Task>("Task", TaskSchema);