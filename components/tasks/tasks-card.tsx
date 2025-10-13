"use client";

import { useState, useRef } from "react";
import { Edit, Trash2, Clock, Calendar, PawPrint, ChevronDown, ChevronUp, RefreshCcw, Target, Smile, Sun, Moon, Copy, ArrowRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Task, FocusLevel, JoyLevel, RecurrenceInterval } from "./types";

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onComplete: (id: string, jobid: string, completed: boolean) => void;
    ownerMap: Record<string, string>;
    onAddToCalendar?: (task: Task) => void;
    onOpenTaskDetails?: (task: Task) => void;
    onCloseSidebar?: () => void;
    onToggleMyDay?: (task: Task, value: boolean) => void;
    onDuplicate?: (task: Task) => void;
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
    onToggleMyDay,
    onDuplicate,
}: TaskCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
    const justClosedDuplicateRef = useRef(false);

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        const utcDateString = date.toISOString().split('T')[0];
        const displayDate = new Date(utcDateString + 'T00:00:00');
      
        return displayDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    };

    const getOwnerName = () => {
        if (!task.owner) return "Not assigned";
        return ownerMap[task.owner] || "Not assigned";
    };

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
            await onComplete(task.id, task.jobId, value);
            console.log(`Task ${task.id} marked as ${value ? 'completed' : 'incomplete'}`);
        } catch (error) {
            console.error("Error updating task completion status:", error);
        }
    };

    const handleTaskClick = () => {
        if (justClosedDuplicateRef.current) {
            return;
        }
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

    const handleJijaClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Mock navigation - replace with your actual navigation logic
        const params = new URLSearchParams();
        params.set("source", "task");
        if (task.jobId) params.set("jobId", task.jobId);
        if (task.title) params.set("jobTitle", task.title);
        if (task.id) params.set("taskId", task.id);
        console.log(`Navigate to: /jija?${params.toString()}`);
        // In your actual code: router.push(`/jija?${params.toString()}`);
    };

    return (
        <div
            className={`rounded-md ${getBorderClasses()} bg-[#F4F4F4] w-full cursor-pointer hover:shadow-md transition-shadow`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleTaskClick}
        >
            <div className="p-2 sm:p-3">
                <div className="flex items-start gap-2 sm:gap-3">
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={task.completed}
                            onCheckedChange={(value) => handleTaskComplete(!!value)}
                            aria-label="Mark as completed"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="mb-2 sm:mb-4">
                            <h3 className="text-sm sm:text-base font-semibold flex flex-wrap items-center gap-1 sm:gap-2">
                                <span className="break-words">{task.title}</span>
                               {task.isNextTask && (
    <span
        className="ml-2 inline-flex items-center justify-center cursor-pointer"
        title="Go to Next Task"
        onClick={e => {
            e.stopPropagation();
            if (onOpenTaskDetails) onOpenTaskDetails(task);
        }}
    >
        <ArrowRight className="h-4 w-4 text-orange-500 hover:text-orange-600 transition-colors" />
    </span>
)}
                              {task.isRecurring && task.recurrenceInterval && (
                                    <span className="flex items-center gap-1 text-blue-500 text-xs font-normal shrink-0">
                                        <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 inline" />
                                        <span className="hidden sm:inline">{task.recurrenceInterval}</span>
                                        <span className="sm:hidden">Recurring</span>
                                    </span>
                                )}
                            </h3>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-10 mb-2">
                            <div className="flex items-center">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs sm:text-sm font-medium text-gray-600 mr-1 sm:mr-2">
                                    {getOwnerName().charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs sm:text-sm text-gray-600 truncate">{getOwnerName()}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-10">
                                {task.focusLevel && (
                                    <div className="flex items-center">
                                        <span className="text-xs sm:text-sm text-gray-600">Focus: <span className="text-xs sm:text-sm font-bold">{task.focusLevel}</span></span>
                                    </div>
                                )}
                                {task.joyLevel && (
                                    <div className="flex items-center">
                                        <span className="text-xs sm:text-sm text-gray-600">Joy: <span className="text-xs sm:text-sm font-bold">{task.joyLevel}</span></span>
                                    </div>
                                )}

                                {task.date && (
                                    <div className="flex items-center">
                                        <span className="text-xs sm:text-sm text-gray-600">Do Date: <span className="text-xs sm:text-sm font-bold">{formatDate(task.date)}</span></span>
                                    </div>
                                )}

                                {task.requiredHours !== undefined && (
                                    <div className="flex items-center">
                                        <span className="text-xs sm:text-sm text-gray-600">Hrs Reqd: <span className="text-xs sm:text-sm font-bold">{task.requiredHours} hrs</span></span>
                                    </div>
                                )}
                            </div>
                        </div>

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

                    <div className="flex flex-row gap-1 shrink-0">
                        {onToggleMyDay && (
                            <Button
                                variant={task.myDay ? "secondary" : "outline"}
                                size="sm"
                                className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center ${task.myDay ? 'text-yellow-600' : 'text-gray-500'}`}
                                onClick={e => {
                                    e.stopPropagation();
                                    onToggleMyDay(task, !task.myDay);
                                }}
                                title={task.myDay ? "Remove from My Day" : "Add to My Day"}
                            >
                                <Sun className={`h-3 w-3 sm:h-4 sm:w-4 ${task.myDay ? 'text-gray-600' : 'text-gray-600'}`} />
                            </Button>
                        )}
                        
                        {onAddToCalendar && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCalendar(task);
                                }}
                                title="Add to calendar"
                            >
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                        )}
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            title="Ask Jija about this task"
                            onClick={handleJijaClick}
                        >
                            <PawPrint className="h-3 w-3 sm:h-4 sm:w-4 text-[#F05523] fill-[#F05523]" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Duplicate Task"
                            onClick={e => {
                                e.stopPropagation();
                                if (onDuplicate) onDuplicate(task);
                            }}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={e => e.stopPropagation()} title="Delete Task">
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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

function getTagColor(tag: string) {
    const hashCode = tag.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const h = Math.abs(hashCode % 360);
    const s = 65 + (hashCode % 20);
    const l = 55 + (hashCode % 15);

    return `hsl(${h}, ${s}%, ${l}%)`;
}
