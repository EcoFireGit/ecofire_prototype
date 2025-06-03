import React, { useState } from "react";
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
  PawPrint,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isHovered, setIsHovered] = useState<Record<string, boolean>>({});

  const formatDate = (dateString?: Date | string) => {
    if (!dateString) return null;
    
    // Parse the date and preserve the UTC date
    const date = new Date(dateString);
    
    // Use toISOString to get YYYY-MM-DD in UTC, then create a new date with just that part
    const utcDateString = date.toISOString().split('T')[0];
    const displayDate = new Date(utcDateString + 'T00:00:00');
  
    return displayDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return "Unassigned";
    return ownerMap[ownerId] || "Unassigned";
  };

  const getJobTitle = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return "Unknown project";
    return jobs[jobId].title || "Unknown project";
  };

  const getBusinessFunctionName = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return null;

    if (businessFunctionMap && jobs[jobId].businessFunctionId) {
      const businessFunctionId = jobs[jobId].businessFunctionId;
      if (businessFunctionMap[businessFunctionId]) {
        return businessFunctionMap[businessFunctionId];
      }
    }

    if (jobs[jobId].businessFunctionName) {
      return jobs[jobId].businessFunctionName;
    }

    return null;
  };

  const getFocusLevelColor = (level?: string) => {
    if (!level) return "text-orange-500";
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

  const getJoyLevelColor = (level?: string) => {
    if (!level) return "text-gray-500";
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

  const getJobImpact = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return 0;
    return jobs[jobId].impact || 0;
  };

  // Helper function to get a consistent unique ID for each task
  const getTaskId = (task: any, index: number) => {
    return task._id || task.id || `task-${index}`;
  };

  if (loading) {
    return <NextTasksSkeletonLoader />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-40">
          <p className="text-muted-foreground">No tasks found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {tasks.map((task, index) => {
        const taskId = getTaskId(task, index);
        const taskIsNext = isNextTask(task);
        return (
          <Card
            key={taskId} // Use just the taskId, which now includes index as fallback
            className={`overflow-hidden hover:shadow-md transition-shadow w-full ${
              taskIsNext ? "border-orange-500 border-2" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-start gap-3 mb-5">
                  <div className="pt-1">
                    <Checkbox
                      checked={task.completed === true}
                      onCheckedChange={(value) => onComplete(taskId, !!value)}
                      aria-label="Mark as completed"
                    />
                  </div>

                  <div
                    className="flex-1 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTask(task);
                    }}
                  >
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

                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Briefcase className="h-3 w-3 mr-1" />
                        <span>{getJobTitle(task.jobId)}</span>
                      </div>
                    </div>
                  </div>

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
                        <Calendar className="h-4 w-4" /> Add to Calendar
                      </Button>
                    )}
                    <div className="flex flex-col gap-2">
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

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/jija?jobTitle=${encodeURIComponent(task.title)}`,
                          );
                        }}
                        title="Ask Jija about this task"
                      >
                        <PawPrint className="h-4 w-4 text-[#F05523] fill-[#F05523]" />
                      </Button>

                      {onDeleteTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Are you sure you want to delete this task?",
                              )
                            ) {
                              onDeleteTask(taskId);
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

                <div className="flex justify-between items-center gap-16 pl-4">
                  <div>
                    {getBusinessFunctionName(task.jobId) && (
                      <Badge variant="secondary">
                        {getBusinessFunctionName(task.jobId)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {task.focusLevel && (
                      <div className="flex items-center">
                        <Circle
                          className={`h-4 w-4 mr-1 ${getFocusLevelColor(
                            task.focusLevel,
                          )}`}
                          fill="currentColor"
                        />
                        <span className="text-sm">
                          Focus: {task.focusLevel}
                        </span>
                      </div>
                    )}

                    {task.joyLevel && (
                      <div className="flex items-center">
                        <Smile
                          className={`h-4 w-4 mr-1 ${getJoyLevelColor(
                            task.joyLevel,
                          )}`}
                        />
                        <span className="text-sm">Joy: {task.joyLevel}</span>
                      </div>
                    )}

                    {task.date && (
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-sm">{formatDate(task.date)}</span>
                      </div>
                    )}

                    {task.requiredHours !== undefined && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {task.requiredHours} hrs
                        </span>
                      </div>
                    )}
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