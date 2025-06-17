"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowDown, ArrowUp, Clock } from "lucide-react";
import { Job } from "@/components/jobs/table/columns";

export type SortOption =
  | "recommended"
  | "dueDate-asc"
  | "dueDate-desc"
  | "hoursRequired-asc"
  | "hoursRequired-desc";

interface SortingComponentProps {
  onSortChange: (sortedJobs: Job[]) => void;
  jobs: Job[];
  taskDetails?: Record<string, any>;
}

const SORT_OPTION_KEY = "jobSortOption";

const SortingComponent: React.FC<SortingComponentProps> = ({
  onSortChange,
  jobs,
  taskDetails = {},
}) => {
  // Initialize with value from localStorage if available
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SORT_OPTION_KEY) as SortOption | null;
      return saved || "recommended";
    }
    return "recommended";
  });

  useEffect(() => {
    localStorage.setItem(SORT_OPTION_KEY, sortOption);
    sortJobs(sortOption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption, jobs, taskDetails]);

  useEffect(() => {
    if (jobs.length > 0) {
      const saved = localStorage.getItem(SORT_OPTION_KEY) as SortOption | null;
      const defaultOption = saved || "recommended";
      setSortOption(defaultOption);
      sortJobs(defaultOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const sortJobs = (option: SortOption) => {
    let sortedJobs = [...jobs];

    switch (option) {
      case "recommended":
        sortedJobs.sort((a, b) => {
          const dateA = a.dueDate
            ? new Date(a.dueDate).getTime()
            : Number.MAX_SAFE_INTEGER;
          const dateB = b.dueDate
            ? new Date(b.dueDate).getTime()
            : Number.MAX_SAFE_INTEGER;
          if (dateA !== dateB) {
            return dateA - dateB;
          }
          const impactA = a.impact || 0;
          const impactB = b.impact || 0;
          return impactB - impactA;
        });
        break;

      case "dueDate-asc":
        sortedJobs.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return (
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          );
        });
        break;

      case "dueDate-desc":
        sortedJobs.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return (
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
          );
        });
        break;

      case "hoursRequired-asc":
        sortedJobs.sort((a, b) => {
          const taskA = a.nextTaskId ? taskDetails[a.nextTaskId] : null;
          const taskB = b.nextTaskId ? taskDetails[b.nextTaskId] : null;
          const hoursA = taskA?.requiredHours || Number.MAX_SAFE_INTEGER;
          const hoursB = taskB?.requiredHours || Number.MAX_SAFE_INTEGER;
          return hoursA - hoursB;
        });
        break;

      case "hoursRequired-desc":
        sortedJobs.sort((a, b) => {
          const taskA = a.nextTaskId ? taskDetails[a.nextTaskId] : null;
          const taskB = b.nextTaskId ? taskDetails[b.nextTaskId] : null;
          const hoursA =
            taskA?.requiredHours !== undefined ? taskA.requiredHours : -1;
          const hoursB =
            taskB?.requiredHours !== undefined ? taskB.requiredHours : -1;
          if (hoursA < 0 && hoursB < 0) return 0;
          if (hoursA < 0) return 1;
          if (hoursB < 0) return -1;
          return hoursB - hoursA;
        });
        break;
    }

    onSortChange(sortedJobs);
  };

  const getOptionDetails = (option: SortOption) => {
    switch (option) {
      case "recommended":
        return {
          label: "Recommended",
          icon: <ArrowUpDown className="h-4 w-4 mr-2" />,
        };
      case "dueDate-asc":
        return {
          label: "Due Date (earliest first)",
          icon: <ArrowUp className="h-4 w-4 mr-2" />,
        };
      case "dueDate-desc":
        return {
          label: "Due Date (latest first)",
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
    }
  };

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground mr-2">Sort by:</span>
        <Select
          value={sortOption}
          onValueChange={(value: SortOption) => setSortOption(value)}
        >
          <SelectTrigger className="w-[250px] h-9">
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
            <SelectItem value="dueDate-asc">
              <div className="flex items-center">
                <ArrowUp className="h-4 w-4 mr-2" />
                Due Date (earliest first)
              </div>
            </SelectItem>
            <SelectItem value="dueDate-desc">
              <div className="flex items-center">
                <ArrowDown className="h-4 w-4 mr-2" />
                Due Date (latest first)
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

export default SortingComponent;