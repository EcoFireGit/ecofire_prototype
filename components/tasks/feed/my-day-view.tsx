import React from "react";
import { Task } from "../types";
import { NextTasks } from "./tasks";

interface MyDayViewProps {
  tasks: Task[];
  onRemoveFromMyDay: (task: Task) => void;
  onComplete: (id: string, completed: boolean) => void;
  onViewTask: (task: Task) => void;
  jobs: Record<string, any>;
  ownerMap: Record<string, string>;
  businessFunctionMap?: Record<string, string>;
  isNextTask: (task: any) => boolean;
}

export default function MyDayView({ tasks, onRemoveFromMyDay, onComplete, onViewTask, jobs, ownerMap, businessFunctionMap, isNextTask }: MyDayViewProps) {
  // Sort: incomplete tasks first, then completed
  const sortedTasks = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  return (
    <NextTasks
      tasks={sortedTasks}
      jobs={jobs}
      onComplete={onComplete}
      onViewTask={onViewTask}
      ownerMap={ownerMap}
      businessFunctionMap={businessFunctionMap}
      isNextTask={isNextTask}
      onToggleMyDay={(task) => onRemoveFromMyDay(task)}
    />
  );
} 