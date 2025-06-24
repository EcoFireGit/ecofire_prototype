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
    recurrencePattern?: RecurrencePattern;
    
    // For custom recurrence: "every X days/weeks/months/years"
    customRecurrenceInterval?: number;
    customRecurrenceUnit?: CustomRecurrenceUnit;
    
    // End conditions
    recurrenceEndType?: RecurrenceEndType;
    recurrenceEndDate?: string; // Keep as string for frontend date handling
    recurrenceMaxOccurrences?: number;
    recurrenceCurrentCount?: number;
    
    // Linking and scheduling
    parentRecurringTaskId?: string;
    nextRecurringDate?: string; 
  };

  