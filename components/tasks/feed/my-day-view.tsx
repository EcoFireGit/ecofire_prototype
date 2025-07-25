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
  onDeleteTask: (id: string) => void;
  onAddToCalendar: (task: Task) => void;
}

export default function MyDayView({ tasks, onRemoveFromMyDay, onComplete, onViewTask, jobs, ownerMap, businessFunctionMap, isNextTask, onDeleteTask, onAddToCalendar }: MyDayViewProps) {
  // Sort: incomplete tasks first, then completed
  const sortedTasks = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  const handleCompleteInMyDay = (id: string, completed: boolean) => {
    onComplete(id, completed);
  };
  return (
    <NextTasks
      tasks={sortedTasks}
      jobs={jobs}
      onComplete={handleCompleteInMyDay}
      onViewTask={onViewTask}
      ownerMap={ownerMap}
      businessFunctionMap={businessFunctionMap}
      isNextTask={isNextTask}
      onToggleMyDay={(task) => onRemoveFromMyDay(task)}
      onDeleteTask={onDeleteTask}
      onAddToCalendar={onAddToCalendar}
    />
  );
} 