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
  };

  