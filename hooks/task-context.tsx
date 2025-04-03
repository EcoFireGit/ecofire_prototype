// task-context.tsx
"use client";

import React, { createContext, useContext, ReactNode } from "react";

// Define the context type with multiple update functions
interface TaskContextType {
  refreshJobProgress: (jobId: string) => void;
  refreshJobOwner: (jobId: string) => void;
}

// Create the context with default values
export const TaskContext = createContext<TaskContextType>({
  refreshJobProgress: () => {},
  refreshJobOwner: () => {},
});

// Custom hook to use the task context
export const useTaskContext = () => useContext(TaskContext);

// Props for the provider component
interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  // Function to trigger job progress updates
  const refreshJobProgress = (jobId: string) => {
    const event = new CustomEvent('job-progress-update', { 
      detail: { jobId } 
    });
    window.dispatchEvent(event);
  };
  
  // Function to trigger job owner updates
  const refreshJobOwner = (jobId: string) => {
    const event = new CustomEvent('job-owner-update', { 
      detail: { jobId } 
    });
    window.dispatchEvent(event);
  };
  
  return (
    <TaskContext.Provider value={{ refreshJobProgress, refreshJobOwner }}>
      {children}
    </TaskContext.Provider>
  );
};