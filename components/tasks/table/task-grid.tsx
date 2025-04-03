"use client";
import { useState, useEffect, Fragment } from "react";
import { Task } from "../types";
import { TaskCard } from "../tasks-card";

interface TaskCardsProps {
  data: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  ownerMap: Record<string, string>;
}

export function TaskCards({
  data,
  onEdit,
  onDelete,
  onComplete,
  ownerMap
}: TaskCardsProps) {
  // Keep a sorted version of the tasks in local state
  const [sortedTasks, setSortedTasks] = useState<Task[]>([]);
  
  // This function sorts tasks and should be used whenever tasks change
  const sortTasks = (tasks: Task[]) => {
    const activeTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);
    
    // Sort active tasks to put next task at top
    const sortedActiveTasks = [...activeTasks].sort((a, b) => {
      if (a.isNextTask) return -1;
      if (b.isNextTask) return 1;
      return 0;
    });
    
    // Return the combined array
    return [...sortedActiveTasks, ...completedTasks];
  };
  
  // When data changes from parent, resort
  useEffect(() => {
    setSortedTasks(sortTasks(data));
  }, [data]);
  
  // Custom complete handler that updates local state immediately
  const handleComplete = async (id: string, completed: boolean) => {
    // First update the local state for immediate feedback
    setSortedTasks(current => {
      // Update the specific task's completed status
      const updatedTasks = current.map(task => 
        task.id === id
          ? {
              ...task,
              completed,
              // If task is completed, it's no longer the next task
              isNextTask: completed ? false : task.isNextTask
            }
          : task
      );
      
      // Resort the tasks so completed ones move to the bottom
      return sortTasks(updatedTasks);
    });
    
    // Then call the actual handler (which updates the server)
    await onComplete(id, completed);
  };
  
  // Handle empty state
  if (sortedTasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border rounded-md">
        No tasks for this job yet.
      </div>
    );
  }
  
  // Find index of first completed task
  const firstCompletedIndex = sortedTasks.findIndex(task => task.completed);
  const hasCompletedTasks = firstCompletedIndex !== -1;
  const hasActiveTasks = sortedTasks.some(task => !task.completed);
  
  return (
    <div className="space-y-4">
      {sortedTasks.map((task, index) => {
        // Add a separator before the first completed task
        const isFirstCompletedTask = hasCompletedTasks && hasActiveTasks && index === firstCompletedIndex;
        
        return (
          <Fragment key={task.id}>
            {isFirstCompletedTask && (
              <div className="pt-4 pb-2 border-t mt-6">
                <div className="text-sm text-gray-500 font-medium">
                  Completed Tasks ({sortedTasks.filter(t => t.completed).length})
                </div>
              </div>
            )}
            
            <TaskCard
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={handleComplete}
              ownerMap={ownerMap}
            />
          </Fragment>
        );
      })}
    </div>
  );
}