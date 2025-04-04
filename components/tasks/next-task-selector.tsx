"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

interface NextTaskSelectorProps {
  tasks: Task[];
  onNextTaskChange: (taskId: string) => Promise<void>;
  currentNextTaskId?: string;
}

export function NextTaskSelector({
  tasks,
  onNextTaskChange,
  currentNextTaskId,
}: NextTaskSelectorProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    currentNextTaskId
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();  
  // Update selected task if the current next task changes
  useEffect(() => {
    setSelectedTaskId(currentNextTaskId);
  }, [currentNextTaskId]);

  const handleValueChange = (value: string) => {
    setSelectedTaskId(value === "none" ? undefined : value);
  };

  const handleSubmit = async () => {
    // Directly submit with the selected value, even if it's "none"
    setIsSubmitting(true);
    try {
      await onNextTaskChange(selectedTaskId || "none");
      toast({
        title: "Success",
        description: "Next task updated successfully",
      });
    } catch (error) {
      console.error("Error updating next task:", error);
      toast({
        title: "Error",
        description: "Failed to update next task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out completed tasks from the dropdown
  const availableTasks = tasks.filter((task) => !task.completed);

  if (availableTasks.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-md border">
      <div className="flex-1">
        <p className="text-sm font-medium mb-2">Set Next Task:</p>
        <Select
          value={selectedTaskId || "none"}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a task to focus on next" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {availableTasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-3"
      >
        <ArrowUp className="h-4 w-4 mr-2" />
        Make Next Step
      </Button>
    </div>
  );
}