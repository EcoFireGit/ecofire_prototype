// components/tasks/types.ts

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

export enum RecurrenceInterval {
  Daily = "Daily",
  Weekly = "Weekly",
  Biweekly = "Biweekly",
  Monthly = "Monthly",
  Quarterly = "Quarterly",
  Annually = "Annually"
}

export type Task = {
  id: string;
  title: string;
  owner?: string;
  date?: string;
  requiredHours?: number;
  focusLevel?: FocusLevel;
  joyLevel?: JoyLevel;
  notes?: string;
  jobId: string;
  completed: boolean;
  tags?: string[];
  isNextTask: boolean;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
};