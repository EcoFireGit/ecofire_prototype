"use client";

import { useState } from "react";
import { Edit, Trash2, Clock, Calendar, PawPrint, ChevronDown, ChevronUp, RefreshCcw, Target, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Task, FocusLevel, JoyLevel, RecurrenceInterval } from "./types";
import { Badge } from "@/components/ui/badge";
import { useTaskContext } from "@/hooks/task-context";

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onComplete: (id: string, jobid: string, completed: boolean) => void;
    ownerMap: Record<string, string>;
    onAddToCalendar?: (task: Task) => void;
    onOpenTaskDetails?: (task: Task) => void;
    onCloseSidebar?: () => void;
}

export function TaskCard({
    task,
    onEdit,
    onDelete,
    onComplete,
    ownerMap,
    onAddToCalendar,
    onOpenTaskDetails,
    onCloseSidebar,
}: TaskCardProps) {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const { refreshJobProgress } = useTaskContext();

    // Format the date
    const formatDate = (dateString?: string) => {
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

    // Get owner name from owner ID
    const getOwnerName = () => {
        if (!task.owner) return "Not assigned";
        return ownerMap[task.owner] || "Not assigned";
    };

    // Get border color based on next task and completion status
    const getBorderClasses = () => {
        if (task.isNextTask) return "border-l-4 border border-orange-500 bg-white";
        if (task.completed) return "border border-gray-200 bg-gray-50";
        return "border border-gray-200 bg-white";
    };

    const formatTimestamp = (dateString?: Date | string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
    };

    const handleTaskComplete = async (value: boolean) => {
        try {
            // Call the original onComplete handler
            await onComplete(task.id, task.jobId, value);
            
            // Then trigger a refresh of the job progress
            refreshJobProgress(task.jobId);
            
            console.log(`Task ${task.id} marked as ${value ? 'completed' : 'incomplete'}`);
        } catch (error) {
            console.error("Error updating task completion status:", error);
        }
    };

    const handleTaskClick = () => {
        if (onOpenTaskDetails) {
            onOpenTaskDetails(task);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await onDelete(task.id);
        if (typeof onCloseSidebar === 'function') {
            onCloseSidebar();
        }
    };

    return (
        <div
            className={`rounded-md ${getBorderClasses()} bg-[#F4F4F4] w-full cursor-pointer hover:shadow-md transition-shadow`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleTaskClick}
        >
            <div className="p-3">
                <div className="flex items-start gap-3">
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={task.completed}
                            onCheckedChange={(value) => handleTaskComplete(!!value)}
                            aria-label="Mark as completed"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {/* Task title */}
                        <div className="mb-4">
                            <h3 className="text-base font-semibold flex items-center gap-2">
                                {task.title}
                                {task.isRecurring && task.recurrenceInterval && (
                                    <span className="flex items-center gap-1 text-blue-500 text-xs font-normal">
                                        <RefreshCcw className="h-4 w-4 inline" />
                                        {task.recurrenceInterval}
                                    </span>
                                )}
                            </h3>
                        </div>

                        {/* Task details */}
                        <div className="flex gap-10 mb-2">
                            {/* Owner info */}
                            <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-medium text-gray-600 mr-2">
                                    {getOwnerName().charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-600">{getOwnerName()}</span>
                            </div>

                            {/* Focus and Joy level row */}
                            <div className="flex items-center gap-10">
                                {task.focusLevel && (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Focus:  <span className="text-sm font-bold">{task.focusLevel}</span></span>
                                       
                                    </div>
                                )}
                                {task.joyLevel && (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Joy: <span className="text-sm font-bold">{task.joyLevel}</span></span>
                                        
                                    </div>
                                )}

                                {/* Date */}
                                {task.date && (
                                    <div className="flex items-center">
                                        {/* <Calendar className="h-4 w-4 text-gray-500 mr-2" /> */}
                                        <span className="text-sm text-gray-600">Do Date: <span className="text-sm font-bold">{formatDate(task.date)}</span></span>
                                    </div>
                                )}

                                {/* Required hours */}
                                {task.requiredHours !== undefined && (
                                    <div className="flex items-center">
                                        {/* <Clock className="h-4 w-4 text-gray-500 mr-2" /> */}
                                        <span className="text-sm text-gray-600">Hrs Reqd: <span className="text-sm font-bold">{task.requiredHours} hrs</span></span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.map((tag, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1">
                        {onAddToCalendar && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCalendar(task);
                                }}
                                title="Add to calendar"
                            >
                                <Calendar className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ask Jija about this task"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/jija?jobTitle=${encodeURIComponent(task.title)}`);
                            }}
                        >
                            <PawPrint className="h-4 w-4 text-[#F05523] fill-[#F05523]" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()} title="Delete Task">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the task.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={e => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function to generate a consistent color for a tag
function getTagColor(tag: string) {
    // Generate a hash code from the tag string
    const hashCode = tag.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Map to HSL color space for better distribution of colors
    const h = Math.abs(hashCode % 360);
    const s = 65 + (hashCode % 20); // 65-85% saturation
    const l = 55 + (hashCode % 15); // 55-70% lightness

    return `hsl(${h}, ${s}%, ${l}%)`;
}