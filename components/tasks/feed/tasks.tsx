import React from "react";
import {
  Calendar,
  Clock,
  Briefcase,
  ChevronRight,
  Edit,
  Trash2,
  Circle,
  Smile,
  FileText,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface NextTasksProps {
  tasks: any[];
  jobs: Record<string, any>;
  onComplete: (id: string, completed: boolean) => void;
  onViewTask: (task: any) => void;
  onAddToCalendar?: (task: any) => void;
  ownerMap: Record<string, string>;
  businessFunctionMap?: Record<string, string>;
  loading?: boolean;
  onEditTask?: (task: any) => void;
  onDeleteTask?: (id: string) => void;
  isNextTask: (task: any) => boolean;
}

export function NextTasks({
  tasks,
  jobs,
  onComplete,
  onViewTask,
  onAddToCalendar,
  ownerMap,
  businessFunctionMap,
  loading = false,
  onEditTask,
  onDeleteTask,
  isNextTask,
}: NextTasksProps) {
  // Format date
  const formatDate = (dateString?: Date | string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get owner name
  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return "Unassigned";
    return ownerMap[ownerId] || "Unassigned";
  };

  // Get job title
  const getJobTitle = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return "Unknown project";
    return jobs[jobId].title || "Unknown project";
  };

  // Get business function name from ID
  const getBusinessFunctionName = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return null;

    // First check if we have a name in our business function map
    if (businessFunctionMap && jobs[jobId].businessFunctionId) {
      const businessFunctionId = jobs[jobId].businessFunctionId;
      if (businessFunctionMap[businessFunctionId]) {
        return businessFunctionMap[businessFunctionId];
      }
    }

    // Check if we have a business function name directly
    if (jobs[jobId].businessFunctionName) {
      return jobs[jobId].businessFunctionName;
    }

    // Return null if we can't find a name
    return null;
  };

  // Get focus level display color
  const getFocusLevelColor = (level?: string) => {
    if (!level) return "text-orange-500"; // Default to medium
    switch (level) {
      case "High":
        return "text-red-500";
      case "Medium":
        return "text-orange-500";
      case "Low":
        return "text-green-500";
      default:
        return "text-orange-500";
    }
  };

  // Get joy level display color
  const getJoyLevelColor = (level?: string) => {
    if (!level) return "text-gray-500"; // Default to medium
    switch (level) {
      case "High":
        return "text-amber-500";
      case "Medium":
        return "text-gray-500";
      case "Low":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  // Get job impact score (for debugging)
  const getJobImpact = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return 0;
    return jobs[jobId].impact || 0;
  };

  if (loading) {
    return <NextTasksSkeletonLoader />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-40">
          <p className="text-muted-foreground">
            No tasks found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {tasks.map((task) => {
        const taskIsNext = isNextTask(task);
        return (
          <Card
            key={task._id}
            className={`overflow-hidden hover:shadow-md transition-shadow w-full ${
              taskIsNext ? "border-orange-500 border-2" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                {/* Top row with checkbox, title, and action buttons */}
                <div className="flex items-start gap-3 mb-5">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <Checkbox
                      checked={task.completed === true}
                      onCheckedChange={(value) => onComplete(task._id, !!value)}
                      aria-label="Mark as completed"
                    />
                  </div>

                  {/* Content - title and job */}
                  <div
                    className="flex-1 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTask(task);
                    }}
                  >
                    {/* Task title */}
                    <div className="mb-3 flex justify-between items-start">
                      <div className="flex items-center">
                        <h3 className="text-base font-semibold group-hover:text-primary transition-colors">
                          {task.title}
                          {taskIsNext && (
                            <Badge className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300">
                              Next
                            </Badge>
                          )}
                        </h3>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Parent job info */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Briefcase className="h-3 w-3 mr-1" />
                        <span>{getJobTitle(task.jobId)}</span>
                        {/* {taskIsNext && task.jobId && jobs[task.jobId]?.impact !== undefined && (
                          <span className="ml-2 text-xs text-gray-500">
                            (Impact: {jobs[task.jobId].impact})
                          </span>
                        )} */}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex">
                    {onAddToCalendar && (
                      <Button
                        variant="ghost"
                        size="default"
                        className="h-8 mr-2 px-2 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCalendar(task);
                        }}
                        title="Add to calendar"
                      >
                        <Calendar className="h-4 w-4" /> Add to Calender
                      </Button>
                    )}
                    <div className="flex flex-col gap-2">
                      {/* Notes button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTask(task);
                        }}
                        title="View notes"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>

                      {onEditTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          title="Edit task"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {onDeleteTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Are you sure you want to delete this task?"
                              )
                            ) {
                              onDeleteTask(task._id);
                            }
                          }}
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom row with business function and task details */}
                <div className="flex justify-between items-center gap-16 pl-4">
                  {/* Business function badge on left */}
                  <div>
                    {getBusinessFunctionName(task.jobId) && (
                      <Badge variant="secondary">
                        {getBusinessFunctionName(task.jobId)}
                      </Badge>
                    )}
                  </div>

                  {/* Task details on right */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {/* Focus Level */}
                    {task.focusLevel && (
                      <div className="flex items-center">
                        <Circle
                          className={`h-4 w-4 mr-1 ${getFocusLevelColor(
                            task.focusLevel
                          )}`}
                          fill="currentColor"
                        />
                        <span className="text-sm">
                          Focus: {task.focusLevel}
                        </span>
                      </div>
                    )}

                    {/* Joy Level */}
                    {task.joyLevel && (
                      <div className="flex items-center">
                        <Smile
                          className={`h-4 w-4 mr-1 ${getJoyLevelColor(
                            task.joyLevel
                          )}`}
                        />
                        <span className="text-sm">Joy: {task.joyLevel}</span>
                      </div>
                    )}

                    {/* Date */}
                    {task.date && (
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-sm">{formatDate(task.date)}</span>
                      </div>
                    )}

                    {/* Hours */}
                    {task.requiredHours !== undefined && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {task.requiredHours} hrs
                        </span>
                      </div>
                    )}
                    {/* Owner */}
                    <div className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-medium mr-2">
                        {getOwnerName(task.owner).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">
                        {getOwnerName(task.owner)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function NextTasksSkeletonLoader() {
  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden w-full">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-sm mt-1" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-5 w-1/2 mb-3" />
                  <div className="flex flex-wrap gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default NextTasks;