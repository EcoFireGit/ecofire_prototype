"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, PawPrint, Copy } from "lucide-react";
import { DuplicateJobDialog } from "./duplicate-job-dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Job } from "@/components/jobs/table/columns";

interface JobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onSelect: (jobId: string, checked: boolean) => void;
  onOpenTasksSidebar: (job: Job) => void;
  isSelected: boolean;
  taskOwnerMap?: Record<string, string>;
  hideCheckbox?: boolean;
  taskCounts?: Record<string, { total: number; completed: number }>;
}

export function JobCard({
  job,
  onEdit,
  onDelete,
  onSelect,
  onOpenTasksSidebar,
  isSelected,
  taskOwnerMap,
  hideCheckbox = false,
  taskCounts = {},
}: JobCardProps) {
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const router = useRouter();
  const [currentJob, setCurrentJob] = useState<Job>(job);

  // Update currentJob when props change
  useEffect(() => {
    setCurrentJob(job);
  }, [job]);

  // Function to fetch job data (for owner updates)
  const fetchJobData = async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Update the local job state with fresh data
        setCurrentJob({
          ...result.data,
          // Preserve the businessFunctionName since it might not be included in the API response
          businessFunctionName:
            result.data.businessFunctionName || job.businessFunctionName,
        });
      }
    } catch (error) {
      console.error("Error fetching job data:", error);
    }
  };

  // Listen for job owner update events
  useEffect(() => {
    const handleOwnerUpdate = (e: CustomEvent<{ jobId: string }>) => {
      // Check if this is the job that needs to be updated
      if (e.detail.jobId === job.id) {
        fetchJobData();
      }
    };

    // Add event listener
    window.addEventListener(
      "job-owner-update",
      handleOwnerUpdate as EventListener,
    );

    // Clean up on unmount
    return () => {
      window.removeEventListener(
        "job-owner-update",
        handleOwnerUpdate as EventListener,
      );
    };
  }, [job.id]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No due date";

    // Parse the date and preserve the UTC date
    const date = new Date(dateString);

    // Use toISOString to get YYYY-MM-DD in UTC, then create a new date with just that part
    const utcDateString = date.toISOString().split("T")[0];
    const displayDate = new Date(utcDateString + "T00:00:00");

    return displayDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get owner name
  const getOwnerName = () => {
    const nextTaskId = currentJob.nextTaskId;
    if (nextTaskId && taskOwnerMap && taskOwnerMap[nextTaskId]) {
      return taskOwnerMap[nextTaskId];
    }
    return "Not assigned";
  };

  // Get task count
  const getTaskCount = () => {
    // Get the completed tasks from taskCounts
    const completed =
      taskCounts && taskCounts[job.id] ? taskCounts[job.id].completed : 0;

    // Get the total tasks from either taskCounts or job.tasks array
    let total = 0;
    if (taskCounts && taskCounts[job.id]) {
      total = taskCounts[job.id].total;
    } else if (currentJob.tasks && Array.isArray(currentJob.tasks)) {
      total = currentJob.tasks.length;
    }

    // If there are no tasks, show "No tasks added"
    if (total === 0) {
      return "No tasks added";
    }

    return `${completed} of ${total} tasks done`;
  };

  // Generate a consistent color for a business function
  const getBusinessFunctionColor = () => {
    const businessFunctionName = currentJob.businessFunctionName || "None";
    // Generate a hash code from the function name
    const hashCode = businessFunctionName.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Map to HSL color space for better distribution of colors
    const h = Math.abs(hashCode % 360);
    const s = 85; // Keep saturation fixed for better readability
    const l = 88; // Higher lightness for background with dark text

    return {
      backgroundColor: `hsl(${h},${s}%,${l}%)`,
      color: `hsl(${h},${s}%,30%)`,
    };
  };

  return (
  <div
    style={{ width: "100%", minHeight: "180px" }}
    className={`bg-[#F4F4F4] border rounded-md shadow-sm ${
      isSelected ? "ring-2 ring-primary" : ""
    }`}
    onClick={() => onOpenTasksSidebar(currentJob)}
  >
    <div className="p-4 cursor-pointer">
      {/* Top section with checkbox, function name, and owner */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {!hideCheckbox && (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(value) => onSelect(currentJob.id, !!value)}
                aria-label="Select job"
              />
            </div>
          )}
          <span
            className="px-2 py-1 text-xs font-medium rounded"
            style={getBusinessFunctionColor()}
          >
            {currentJob.businessFunctionName || "No function"}
          </span>
        </div>
        <span className="text-sm font-medium">{getOwnerName()}</span>
      </div>

        {/* Job title with job number */}
        <div className="mb-6 pl-6">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{currentJob.title}</h3>
          </div>
        </div>

      {/* Bottom section with task count and due date */}
      <div className="flex items-center justify-between pl-6">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">{getTaskCount()}</p>
          <p className="text-sm text-gray-500">
            Due date: {formatDate(currentJob.dueDate)}
          </p>
        </div>
      </div>
    </div>

    {/* Bottom section with job number and action buttons */}
    <div
      className="flex justify-between items-center p-2 border-t"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 ml-2">
      <span 
        className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2"
        title="This is the Job number"
      >
        #{currentJob.jobNumber}
      </span>
      </div>
      <div className="flex">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={async (e) => {
            e.stopPropagation();
            setIsDuplicateDialogOpen(true);
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Ask Jija about this job"
          onClick={(e) => {
            e.stopPropagation();
            router.push(
              `/jija?jobTitle=${encodeURIComponent(currentJob.title)}`,
            );
          }}
        >
          <PawPrint className="h-4 w-4  text-[#F05523] fill-[#F05523]" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                job "{currentJob.title}" and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(currentJob.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>

    <DuplicateJobDialog
      open={isDuplicateDialogOpen}
      onOpenChange={setIsDuplicateDialogOpen}
      sourceJob={currentJob}
      onSubmit={() => {}} // The actual duplication logic is handled inside DuplicateJobDialog
    />
  </div>
);
}
