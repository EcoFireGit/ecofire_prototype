import mongoose from "mongoose";
export enum FocusLevel {
  High = "High",
  Medium = "Medium",
  Low = "Low"
}
export enum JoyLevel {
  High = "High",
  Medium = "Medium",
  Low = "Low"
}

export enum RecurrencePattern {
  Daily = "daily",
  Weekly = "weekly", 
  Biweekly = "biweekly",
  Monthly = "monthly",
  Annually = "annually",
  Custom = "custom"
}

export enum RecurrenceEndType {
  Never = "never",
  OnDate = "onDate",
  AfterOccurrences = "afterOccurrences"
}

export enum CustomRecurrenceUnit {
  Days = "days",
  Weeks = "weeks", 
  Months = "months",
  Years = "years"
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
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  customRecurrenceInterval?: number;
  customRecurrenceUnit?: CustomRecurrenceUnit;
  recurrenceEndType?: RecurrenceEndType;
  recurrenceEndDate?: Date;
  recurrenceMaxOccurrences?: number;
  recurrenceCurrentCount?: number;
  parentRecurringTaskId?: string;
  nextRecurringDate?: Date;

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
    required: false,
  },
  joyLevel: {
    type: String,
    enum: Object.values(JoyLevel),
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
    isRecurring: {
    type: Boolean,
    default: false,
    required: true
  },
  recurrencePattern: {
    type: String,
    enum: Object.values(RecurrencePattern),
    required: false,
  },
  customRecurrenceInterval: {
    type: Number,
    required: false,
    min: 1
  },
  customRecurrenceUnit: {
    type: String,
    enum: Object.values(CustomRecurrenceUnit),
    required: false,
  },
  recurrenceEndType: {
    type: String,
    enum: Object.values(RecurrenceEndType),
    required: false,
  },
  recurrenceEndDate: {
    type: Date,
    required: false,
  },
  recurrenceMaxOccurrences: {
    type: Number,
    required: false,
    min: 1
  },
  recurrenceCurrentCount: {
    type: Number,
    default: 0,
    required: false
  },
  parentRecurringTaskId: {
    type: String,
    required: false,
    index: true
  },
  nextRecurringDate: {
    type: Date,
    required: false,
    index: true
  }
});

// Create a compound index to ensure only one task per job is marked as next
TaskSchema.index({ jobId: 1, nextTask: 1 }, { 
  unique: true,
  partialFilterExpression: { nextTask: true }
});

TaskSchema.index({ title: 'text', notes: 'text', tags: 'text' });

TaskSchema.index({ isRecurring: 1, nextRecurringDate: 1, isDeleted: 1 });
TaskSchema.index({ parentRecurringTaskId: 1, isDeleted: 1 });

export default mongoose.models.Task || mongoose.model<Task>("Task", TaskSchema);