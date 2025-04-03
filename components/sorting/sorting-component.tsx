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
import { Job } from "@/components/jobs/table/columns";

export type SortOption = "recommended" | "dueDate-asc" | "dueDate-desc" | "hoursRequired-asc" | "hoursRequired-desc";

interface SortingComponentProps {
  onSortChange: (sortedJobs: Job[]) => void;
  jobs: Job[];
  taskDetails?: Record<string, any>;
}

const SortingComponent: React.FC<SortingComponentProps> = ({
  onSortChange,
  jobs,
  taskDetails = {}
}) => {
  const [sortOption, setSortOption] = useState<SortOption>("recommended");

  useEffect(() => {
    sortJobs(sortOption);
  }, [sortOption, jobs]);

  const sortJobs = (option: SortOption) => {
    // Make a copy of the jobs array to avoid mutating the original
    let sortedJobs = [...jobs];

    switch (option) {
      case "recommended":
        // Sort by due date (ascending), then by impact (descending)
        sortedJobs.sort((a, b) => {
          // First compare due dates (null dates go to the end)
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          
          if (dateA !== dateB) {
            return dateA - dateB; // Ascending by date
          }
          
          // If dates are the same (or both null), sort by impact descending
          const impactA = a.impact || 0;
          const impactB = b.impact || 0;
          return impactB - impactA; // Descending by impact
        });
        break;

      case "dueDate-asc":
        // Sort by due date (ascending), nulls at the end
        sortedJobs.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;

      case "dueDate-desc":
        // Sort by due date (descending), nulls at the end
        sortedJobs.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        });
        break;

      case "hoursRequired-asc":
        // Sort by hours required (ascending), nulls at the end
        sortedJobs.sort((a, b) => {
          const taskA = a.nextTaskId ? taskDetails[a.nextTaskId] : null;
          const taskB = b.nextTaskId ? taskDetails[b.nextTaskId] : null;
          
          const hoursA = taskA?.requiredHours || Number.MAX_SAFE_INTEGER;
          const hoursB = taskB?.requiredHours || Number.MAX_SAFE_INTEGER;
          
          return hoursA - hoursB;
        });
        break;

      case "hoursRequired-desc":
        // Sort by hours required (descending), nulls at the end
        sortedJobs.sort((a, b) => {
          const taskA = a.nextTaskId ? taskDetails[a.nextTaskId] : null;
          const taskB = b.nextTaskId ? taskDetails[b.nextTaskId] : null;
          
          // Use 0 as default for null values, but place them at the end
          const hoursA = taskA?.requiredHours !== undefined ? taskA.requiredHours : -1;
          const hoursB = taskB?.requiredHours !== undefined ? taskB.requiredHours : -1;
          
          if (hoursA < 0 && hoursB < 0) return 0;
          if (hoursA < 0) return 1;
          if (hoursB < 0) return -1;
          
          return hoursB - hoursA;
        });
        break;
    }

    onSortChange(sortedJobs);
  };

  // Helper function to get option label and icon
  const getOptionDetails = (option: SortOption) => {
    switch (option) {
      case "recommended":
        return { label: "Recommended", icon: <ArrowUpDown className="h-4 w-4 mr-2" /> };
      case "dueDate-asc":
        return { label: "Due Date (earliest first)", icon: <ArrowUp className="h-4 w-4 mr-2" /> };
      case "dueDate-desc":
        return { label: "Due Date (latest first)", icon: <ArrowDown className="h-4 w-4 mr-2" /> };
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
          onValueChange={(value: SortOption) => setSortOption(value)}
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