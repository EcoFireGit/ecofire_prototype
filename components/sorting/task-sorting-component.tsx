"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowDown, ArrowUp, Clock, CalendarClock } from "lucide-react";

export type TaskSortOption = "recommended" | "date-asc" | "date-desc" | "hoursRequired-asc" | "hoursRequired-desc";

interface TaskSortingComponentProps {
  onSortChange: (sortedTasks: any[]) => void;
  tasks: any[];
  jobs: Record<string, any>;
}

const TaskSortingComponent: React.FC<TaskSortingComponentProps> = ({
  onSortChange,
  tasks,
  jobs
}) => {
  const [sortOption, setSortOption] = useState<TaskSortOption>("recommended");

  useEffect(() => {
    sortTasks(sortOption);
  }, [sortOption, tasks]);

  const sortTasks = (option: TaskSortOption) => {
    // Make a copy of the tasks array to avoid mutating the original
    let sortedTasks = [...tasks];

    switch (option) {
      case "recommended":
        // Sort by next tasks first, then by job impact score (higher first)
        sortedTasks.sort((a, b) => {
          // Check if task is a next task
          const aIsNextTask = a.jobId && jobs[a.jobId]?.nextTaskId === a._id;
          const bIsNextTask = b.jobId && jobs[b.jobId]?.nextTaskId === b._id;
          
          // First sort by next task status
          if (aIsNextTask && !bIsNextTask) return -1;
          if (!aIsNextTask && bIsNextTask) return 1;
          
          // If both are next tasks, sort by job impact score (higher first)
          if (aIsNextTask && bIsNextTask) {
            const aImpact = jobs[a.jobId]?.impact || 0;
            const bImpact = jobs[b.jobId]?.impact || 0;
            return bImpact - aImpact;
          }
          
          // If neither are next tasks, sort by date
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          }
          
          // Default fallback for sorting
          return 0;
        });
        break;

      case "date-asc":
        // Sort by date (ascending), nulls at the end
        sortedTasks.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        break;

      case "date-desc":
        // Sort by date (descending), nulls at the end
        sortedTasks.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        break;

      case "hoursRequired-asc":
        // Sort by hours required (ascending), nulls at the end
        sortedTasks.sort((a, b) => {
          const hoursA = a.requiredHours !== undefined ? a.requiredHours : Number.MAX_SAFE_INTEGER;
          const hoursB = b.requiredHours !== undefined ? b.requiredHours : Number.MAX_SAFE_INTEGER;
          return hoursA - hoursB;
        });
        break;

      case "hoursRequired-desc":
        // Sort by hours required (descending), nulls at the end
        sortedTasks.sort((a, b) => {
          // Use 0 as default for null values, but place them at the end
          const hoursA = a.requiredHours !== undefined ? a.requiredHours : -1;
          const hoursB = b.requiredHours !== undefined ? b.requiredHours : -1;
          
          if (hoursA < 0 && hoursB < 0) return 0;
          if (hoursA < 0) return 1;
          if (hoursB < 0) return -1;
          
          return hoursB - hoursA;
        });
        break;
    }

    onSortChange(sortedTasks);
  };

  // Helper function to get option label and icon
  const getOptionDetails = (option: TaskSortOption) => {
    switch (option) {
      case "recommended":
        return { label: "Recommended", icon: <ArrowUpDown className="h-4 w-4 mr-2" /> };
      case "date-asc":
        return { label: "Date (earliest first)", icon: <ArrowUp className="h-4 w-4 mr-2" /> };
      case "date-desc":
        return { label: "Date (latest first)", icon: <ArrowDown className="h-4 w-4 mr-2" /> };
      case "hoursRequired-asc":
        return { label: "Hours Required (low to high)", icon: <Clock className="h-4 w-4 mr-2" /> };
      case "hoursRequired-desc":
        return { label: "Hours Required (high to low)", icon: <Clock className="h-4 w-4 mr-2" /> };
    }
  };

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-2">Sort by:</span>
        <Select
          value={sortOption}
          onValueChange={(value: TaskSortOption) => setSortOption(value)}
        >
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue>
              <div className="flex items-center">
                {getOptionDetails(sortOption).icon}
                {getOptionDetails(sortOption).label}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">
              <div className="flex items-center">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Recommended
              </div>
            </SelectItem>
            <SelectItem value="date-asc">
              <div className="flex items-center">
                <ArrowUp className="h-4 w-4 mr-2" />
                Date (earliest first)
              </div>
            </SelectItem>
            <SelectItem value="date-desc">
              <div className="flex items-center">
                <ArrowDown className="h-4 w-4 mr-2" />
                Date (latest first)
              </div>
            </SelectItem>
            <SelectItem value="hoursRequired-asc">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Hours Required (low to high)
              </div>
            </SelectItem>
            <SelectItem value="hoursRequired-desc">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Hours Required (high to low)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TaskSortingComponent;