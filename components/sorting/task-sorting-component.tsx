"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Clock,
  Calendar
} from "lucide-react";

export type TaskSortOption =
  | "recommended"
  | "date-asc"
  | "date-desc"
  | "hoursRequired-asc"
  | "hoursRequired-desc"
  | "createdDate-asc"
  | "createdDate-desc";

interface TaskSortingComponentProps {
  onSortChange: (sortedTasks: any[]) => void;
  tasks: any[];
  jobs: Record<string, any>;
}

const TASK_SORT_OPTION_KEY = "taskSortOption";

const TaskSortingComponent: React.FC<TaskSortingComponentProps> = ({
  onSortChange,
  tasks,
  jobs,
}) => {
  // Persist sort option in localStorage
  const [sortOption, setSortOption] = useState<TaskSortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TASK_SORT_OPTION_KEY) as TaskSortOption | null;
      return saved || "recommended";
    }
    return "recommended";
  });

  useEffect(() => {
    localStorage.setItem(TASK_SORT_OPTION_KEY, sortOption);
    sortTasks(sortOption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption, tasks]);

  useEffect(() => {
    if (tasks.length > 0) {
      const saved = localStorage.getItem(TASK_SORT_OPTION_KEY) as TaskSortOption | null;
      const defaultOption = saved || "recommended";
      setSortOption(defaultOption);
      sortTasks(defaultOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const sortTasks = (option: TaskSortOption) => {
    // Make a copy of the tasks array to avoid mutating the original
    let sortedTasks = [...tasks];

    switch (option) {
      case "recommended":
        // Sort by earliest do-date first, then next tasks, then impact score
        sortedTasks.sort((a, b) => {
          // First sort by earliest do-date (ascending - earliest first)
          if (a.date && b.date) {
            const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateComparison !== 0) return dateComparison;
          } else if (a.date && !b.date) {
            return -1; // Tasks with dates come before tasks without dates
          } else if (!a.date && b.date) {
            return 1;
          }

          // If dates are the same (or both null), check next task status
          const aIsNextTask = a.jobId && jobs[a.jobId]?.nextTaskId === a._id;
          const bIsNextTask = b.jobId && jobs[b.jobId]?.nextTaskId === b._id;

          if (aIsNextTask && !bIsNextTask) return -1;
          if (!aIsNextTask && bIsNextTask) return 1;

          // If both are next tasks (or both are not), sort by job impact score (higher first)
          if (aIsNextTask && bIsNextTask) {
            const aImpact = jobs[a.jobId]?.impact || 0;
            const bImpact = jobs[b.jobId]?.impact || 0;
            return bImpact - aImpact;
          }

          // For non-next tasks, also sort by impact score
          const aImpact = jobs[a.jobId]?.impact || 0;
          const bImpact = jobs[b.jobId]?.impact || 0;
          return bImpact - aImpact;
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
          const hoursA =
            a.requiredHours !== undefined
              ? a.requiredHours
              : Number.MAX_SAFE_INTEGER;
          const hoursB =
            b.requiredHours !== undefined
              ? b.requiredHours
              : Number.MAX_SAFE_INTEGER;
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

        case "createdDate-asc":
          sortedTasks.sort((a, b) => {
            if (!a.createdDate) return 1;
            if (!b.createdDate) return -1;
            return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
          });
          break;

        case "createdDate-desc":
          sortedTasks.sort((a, b) => {
            if (!a.createdDate) return 1;
            if (!b.createdDate) return -1;
            return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
          });
          break;
            }

    onSortChange(sortedTasks);
  };

  // Helper function to get option label and icon
  const getOptionDetails = (option: TaskSortOption) => {
    switch (option) {
      case "recommended":
        return {
          label: "Recommended",
          icon: <ArrowUpDown className="h-4 w-4 mr-2" />,
        };
      case "date-asc":
        return {
          label: "Do Date (earliest first)",
          icon: <ArrowUp className="h-4 w-4 mr-2" />,
        };
      case "date-desc":
        return {
          label: "Do Date (latest first)",
          icon: <ArrowDown className="h-4 w-4 mr-2" />,
        };
      case "hoursRequired-asc":
        return {
          label: "Hours Required (low to high)",
          icon: <Clock className="h-4 w-4 mr-2" />,
        };
      case "hoursRequired-desc":
        return {
          label: "Hours Required (high to low)",
          icon: <Clock className="h-4 w-4 mr-2" />,
        };
      case "createdDate-asc":
        return {
          label: "Created Date (earliest first)",
          icon: <Calendar className="h-4 w-4 mr-2" />,
        };
      case "createdDate-desc":
        return {
          label: "Created Date (latest first)",
          icon: <Calendar className="h-4 w-4 mr-2" />,
        };
    }
  };

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2">
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
                Do Date (earliest first)
              </div>
            </SelectItem>
            <SelectItem value="date-desc">
              <div className="flex items-center">
                <ArrowDown className="h-4 w-4 mr-2" />
                Do Date (latest first)
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
            <SelectItem value="createdDate-asc">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Created Date (earliest first)
              </div>
            </SelectItem>
            <SelectItem value="createdDate-desc">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Created Date (latest first)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TaskSortingComponent;