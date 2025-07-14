"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Calendar, Clock, Briefcase, Circle, Smile, ChevronRight } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

interface SearchResultCardProps {
  result: { 
    id: string; 
    title: string; 
    notes: string; 
    type: string; 
    author?: string;
    businessFunctionId?: string;
    businessFunctionName?: string;
    dueDate?: string;
    date?: string; // For tasks (do date)
    owner?: string;
    focusLevel?: string;
    joyLevel?: string;
    requiredHours?: number;
    jobNumber?: string;
    tasks?: any[];
    isNextTask?: boolean;
    completed?: boolean;
    isDone?: boolean;
    jobId?: string;
    _id?: string;
  };
  index: number;
  onOpenTasksSidebar: (result: any) => void;
  onEdit?: (result: any) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  taskOwnerMap?: Record<string, string>;
  jobs?: Record<string, any>;
}

export function SearchResultCard({
  result,
  index,
  onOpenTasksSidebar,
  onEdit,
  onDelete,
  isSelected = false,
  taskOwnerMap,
  jobs = {}
}: SearchResultCardProps) {
  const router = useRouter();

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    const utcDateString = date.toISOString().split("T")[0];
    const displayDate = new Date(utcDateString + "T00:00:00");
    return displayDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return "Unassigned";
    return taskOwnerMap?.[ownerId] || "Unassigned";
  };

  const getBusinessFunctionColor = () => {
    const businessFunctionName = result.businessFunctionName || "None";
    const hashCode = businessFunctionName.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const h = Math.abs(hashCode % 360);
    const s = 85;
    const l = 88;
    return {
      backgroundColor: `hsl(${h},${s}%,${l}%)`,
      color: `hsl(${h},${s}%,30%)`,
    };
  };

  const getFocusLevelColor = (level?: string) => {
    if (!level) return "text-orange-500";
    switch (level) {
      case "High": return "text-red-500";
      case "Medium": return "text-orange-500";
      case "Low": return "text-green-500";
      default: return "text-orange-500";
    }
  };

  const getJoyLevelColor = (level?: string) => {
    if (!level) return "text-gray-500";
    switch (level) {
      case "High": return "text-amber-500";
      case "Medium": return "text-gray-500";
      case "Low": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const getTaskCount = () => {
    if (!result.tasks || !Array.isArray(result.tasks)) {
      return "No tasks added";
    }
    const total = result.tasks.length;
    if (total === 0) return "No tasks added";
    return `${total} tasks`;
  };

    const getJobTitle = (jobId?: string) => {
    if (!jobId || !jobs[jobId]) return "Unknown job";
    return jobs[jobId].title || "Unknown job";
  };

  const isJob = result.type.toLowerCase() === 'job';
  const isTask = result.type.toLowerCase() === 'task';
  
  const isNextTask = isTask && result.jobId && jobs[result.jobId] 
    ? jobs[result.jobId].nextTaskId === (result._id || result.id)
    : result.isNextTask || false;

  if (isJob) {
    return (
      <div
        style={{ width: "800px", minWidth: "800px", maxWidth: "800px", minHeight: "140px" }}
        className={`bg-[#F4F4F4] border rounded-md shadow-sm cursor-pointer ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => onOpenTasksSidebar(result)}
      >
        <div className="p-4">
          {/* Top section with type badge, business function and delete button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                job
              </span>
              <span
                className="px-2 py-1 text-xs font-medium rounded"
                style={getBusinessFunctionColor()}
              >
                {result.businessFunctionName || "No function"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">#{index + 1}</span>
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the job "{result.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(result.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Job title */}
          <div className="mb-6">
            <h3 className="text-base font-semibold">{result.title}</h3>
          </div>

          {/* Bottom section with task count and due date */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">{getTaskCount()}</p>
              <p className="text-sm text-gray-500">
                Due date: {result.dueDate ? formatDate(result.dueDate) : "No due date"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom section with job number */}
        <div
          className="flex justify-between items-center p-2 border-t"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 ml-2">
            <span 
              className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2"
              title="Job number"
            >
              #{result.jobNumber || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <Card
        style={{ width: "800px", minWidth: "800px", maxWidth: "800px", minHeight: "140px" }}
        className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
          isNextTask ? "border-orange-500 border-2" : ""
        } ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={() => onOpenTasksSidebar(result)}
      >
        <CardContent className="p-4">
          <div className="flex flex-col">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex-1">
                <div className="mb-3 flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                      task
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the task "{result.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(result.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                  </div>
                </div>

                <div className="mb-2">
                  <h3 className="text-base font-semibold hover:text-primary transition-colors">
                    {result.title}
                    {isNextTask && (
                      <Badge className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300">
                        Next
                      </Badge>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Briefcase className="h-3 w-3 mr-1" />
                    <span>{getJobTitle(result.jobId)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-16">
              <div>
                {result.businessFunctionName && (
                  <Badge variant="secondary">
                    {result.businessFunctionName}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {result.focusLevel && (
                  <div className="flex items-center">
                    <Circle
                      className={`h-4 w-4 mr-1 ${getFocusLevelColor(result.focusLevel)}`}
                      fill="currentColor"
                    />
                    <span className="text-sm">
                      Focus: {result.focusLevel}
                    </span>
                  </div>
                )}

                {result.joyLevel && (
                  <div className="flex items-center">
                    <Smile
                      className={`h-4 w-4 mr-1 ${getJoyLevelColor(result.joyLevel)}`}
                    />
                    <span className="text-sm">Joy: {result.joyLevel}</span>
                  </div>
                )}

                {result.date && (
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="text-sm">{formatDate(result.date)}</span>
                  </div>
                )}

                {result.requiredHours !== undefined && (
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {result.requiredHours} hrs
                    </span>
                  </div>
                )}

                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-medium mr-2">
                    {getOwnerName(result.owner).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">
                    {getOwnerName(result.owner)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}