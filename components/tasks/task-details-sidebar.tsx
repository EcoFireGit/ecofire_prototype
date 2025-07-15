"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  BarChart, 
  Heart, 
  ChevronLeft,
  Briefcase,
  Check,
  X,
  Info,
  PawPrint,
  Trash2,
  Tags,
  Plus,
  RefreshCcw,
  Tag,
  Edit,
  ChevronRight
} from "lucide-react";
import { Task, RecurrenceInterval } from "@/components/tasks/types";
import { JobDialog } from "@/components/jobs/job-dialog";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

interface TaskDetailsSidebarTask extends Task {

}

interface JobInfo {
  id: string;
  title: string;
  jobNumber?: string;
  businessFunctionName?: string;
}

interface TaskDetailsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTask: TaskDetailsSidebarTask | null;
  onTaskUpdated?: (updatedTask: TaskDetailsSidebarTask) => void;
  onNavigateToJob?: (jobId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

type EditableField = 
  | 'title' 
  | 'owner' 
  | 'date' 
  | 'requiredHours' 
  | 'focusLevel' 
  | 'joyLevel' 
  | 'notes'
  | 'job'
  | 'tags';

export function TaskDetailsSidebar({
  open,
  onOpenChange,
  selectedTask,
  onTaskUpdated,
  onNavigateToJob,
  onDeleteTask,
}: TaskDetailsSidebarProps) {
  const [taskDetails, setTaskDetails] = useState<TaskDetailsSidebarTask | null>(null);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [businessFunctionMap, setBusinessFunctionMap] = useState<Record<string, string>>({});
  const [owners, setOwners] = useState<{ _id: string; name: string }[]>([]);
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [availableTags, setAvailableTags] = useState<{ _id: string; name: string }[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [recurringEdit, setRecurringEdit] = useState<{
    isEditing: boolean;
    interval: RecurrenceInterval | undefined;
  }>({ isEditing: false, interval: undefined });

  const { toast } = useToast();

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const response = await fetch("/api/owners");
        const result = await response.json();

        const mapping: Record<string, string> = {};
        const ownersData = Array.isArray(result) ? result : (result.data || []);
        
        ownersData.forEach((owner: { _id: string; name: string }) => {
          if (owner._id && owner.name) {
            mapping[owner._id] = owner.name;
          }
        });
        
        setOwnerMap(mapping);
        setOwners(ownersData);
      } catch (error) {
        console.error("Error fetching owners:", error);
      }
    };

    fetchOwners();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch("/api/jobs");
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          const jobsMap: Record<string, any> = {};
          result.data.forEach((job: any) => {
            if (job._id) {
              jobsMap[job._id] = job;
            }
          });
          setJobs(jobsMap);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    const fetchBusinessFunctions = async () => {
      try {
        const response = await fetch("/api/business-functions");
        const result = await response.json();

        if (result.success) {
          const mapping: Record<string, string> = {};
          result.data.forEach((bf: any) => {
            mapping[bf._id] = bf.name;
          });
          setBusinessFunctionMap(mapping);
        }
      } catch (error) {
        console.error("Error fetching business functions:", error);
      }
    };

    fetchBusinessFunctions();
  }, []);

  useEffect(() => {
    const fetchTaskAndJobDetails = async () => {
      if (!selectedTask) {
        setTaskDetails(null);
        setJobInfo(null);
        return;
      }

      setIsLoading(true);
      try {
        const taskResponse = await fetch(`/api/tasks/${selectedTask.id}`);
        const taskResult = await taskResponse.json();
        
        if (taskResult.success) {
          const detailedTask = {
            ...selectedTask,
            ...taskResult.data,
            id: selectedTask.id,
          };
          setTaskDetails(detailedTask);

          if (detailedTask.jobId) {
            const jobResponse = await fetch(`/api/jobs/${detailedTask.jobId}`);
            const jobResult = await jobResponse.json();
            
            if (jobResult.success) {
              setJobInfo({
                id: jobResult.data._id || jobResult.data.id,
                title: jobResult.data.title,
                jobNumber: jobResult.data.jobNumber,
                businessFunctionName: businessFunctionMap[jobResult.data.businessFunctionId] || 'No function'
              });
            }
          } else {
            setJobInfo(null);
          }
        } else {
          setTaskDetails(selectedTask);
        }
      } catch (error) {
        console.error("Error fetching task details:", error);
        setTaskDetails(selectedTask);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskAndJobDetails();
  }, [selectedTask, businessFunctionMap]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/task-tags");
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          setAvailableTags(result.data);
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    
    const date = new Date(dateString);
    const utcDateString = date.toISOString().split('T')[0];
    const displayDate = new Date(utcDateString + 'T00:00:00');
    
    return displayDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return "Not assigned";
    return ownerMap[ownerId] || "Not assigned";
  };

  const getFocusLevelColor = (level?: string): string => {
    if (!level) return "bg-gray-100 text-gray-800";
    
    switch(level) {
      case 'High':
        return "bg-red-100 text-red-800";
      case 'Medium':
        return "bg-orange-100 text-orange-800";
      case 'Low':
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getJoyLevelColor = (level?: string): string => {
    if (!level) return "bg-gray-100 text-gray-800";
    
    switch(level) {
      case 'High':
        return "bg-green-100 text-green-800";
      case 'Medium':
        return "bg-blue-100 text-blue-800";
      case 'Low':
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const startEditing = (field: EditableField, currentValue: any) => {
    setEditingField(field);
    
    switch (field) {
      case 'date':
        if (currentValue) {
          const date = new Date(currentValue);
          setEditingValue(date.toISOString().split('T')[0]);
        } else {
          setEditingValue('');
        }
        break;
      case 'requiredHours':
        setEditingValue(currentValue?.toString() || '');
        break;
      case 'job':
        setEditingValue(currentValue || 'none');
        break;
      case 'focusLevel':
      case 'joyLevel':
        setEditingValue(currentValue || 'none');
        break;
      case 'owner':
        setEditingValue(currentValue || 'none');
        break;
      case 'tags':
        setEditingTags(Array.isArray(currentValue) ? [...currentValue] : []);
        setNewTagInput('');
        break;
      default:
        setEditingValue(currentValue || '');
    }
  };

const cancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
    setEditingTags([]);
    setNewTagInput('');
  };

  const saveEdit = async () => {
    if (!taskDetails || !editingField) return;

    setIsSaving(true);
    try {
      const originalJobId = taskDetails.jobId;
      
      const updateData: any = {};
      
      switch (editingField) {
        case 'title':
          updateData.title = editingValue;
          break;
        case 'owner':
          updateData.owner = editingValue === 'none' ? null : editingValue;
          break;
        case 'date':
          updateData.date = editingValue ? `${editingValue}T00:00:00.000Z` : null;
          break;
        case 'requiredHours':
          updateData.requiredHours = editingValue ? parseFloat(editingValue) : null;
          break;
        case 'focusLevel':
          updateData.focusLevel = editingValue === 'none' ? null : editingValue;
          break;
        case 'joyLevel':
          updateData.joyLevel = editingValue === 'none' ? null : editingValue;
          break;
        case 'notes':
          updateData.notes = editingValue;
          break;
        case 'job':
          updateData.jobId = editingValue === 'none' ? null : editingValue;
          break;
        case 'tags':
          updateData.tags = editingTags;
          break;
      }

      console.log('Updating task with data:', updateData);

      const response = await fetch(`/api/tasks/${taskDetails.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      console.log('Update result:', result);

      if (result.success) {
        const updatedTask: TaskDetailsSidebarTask = {
          ...taskDetails,
          ...result.data,
          id: taskDetails.id,
        };

        setTaskDetails(updatedTask);
        
        if (editingField === 'job' && updatedTask.jobId) {
          const jobResponse = await fetch(`/api/jobs/${updatedTask.jobId}`);
          const jobResult = await jobResponse.json();
          
          if (jobResult.success) {
            setJobInfo({
              id: jobResult.data._id || jobResult.data.id,
              title: jobResult.data.title,
              jobNumber: jobResult.data.jobNumber,
              businessFunctionName: businessFunctionMap[jobResult.data.businessFunctionId] || 'No function'
            });
          }
        } else if (editingField === 'job' && !updatedTask.jobId) {
          setJobInfo(null);
        }

        if (editingField === 'job') {
          const newJobId = updatedTask.jobId;
          
          if (originalJobId && originalJobId !== newJobId) {
            const originalJobRefreshEvent = new CustomEvent('refresh-job-tasks', {
              detail: { jobId: originalJobId }
            });
            window.dispatchEvent(originalJobRefreshEvent);
            
            const originalJobProgressEvent = new CustomEvent('job-progress-update', {
              detail: { jobId: originalJobId }
            });
            window.dispatchEvent(originalJobProgressEvent);
          }
          
          if (newJobId) {
            const newJobRefreshEvent = new CustomEvent('refresh-job-tasks', {
              detail: { jobId: newJobId }
            });
            window.dispatchEvent(newJobRefreshEvent);
            
            const newJobProgressEvent = new CustomEvent('job-progress-update', {
              detail: { jobId: newJobId }
            });
            window.dispatchEvent(newJobProgressEvent);
          }
        }
        
        if (onTaskUpdated) {
          onTaskUpdated(updatedTask);
        }

        toast({
          title: "Success",
          description: "Task updated successfully",
        });

        setEditingField(null);
        setEditingValue('');
        setEditingTags([]);
        setNewTagInput('');
      } else {
        throw new Error(result.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !editingTags.includes(trimmedTag)) {
      setEditingTags([...editingTags, trimmedTag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleNewTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      addTag(newTagInput);
      setNewTagInput('');
    }
  };

  const handleNewJobSubmit = async (jobData: any) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) throw new Error("Failed to create job");
      const createdJob = await response.json();

      const newJobId = createdJob.data?._id || createdJob._id || createdJob.id;

      setJobs((prevJobs) => ({
        ...prevJobs,
        [newJobId]: {
          _id: newJobId,
          title: jobData.title || createdJob.data?.title || "New Job",
          ...createdJob.data,
        },
      }));

      setEditingValue(newJobId);

      setIsJobDialogOpen(false);

      toast({
        title: "Success",
        description: "Job created successfully",
      });
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  const handleNavigateToJob = () => {
    if (jobInfo && onNavigateToJob) {
      onOpenChange(false);
      
      setTimeout(() => {
        onNavigateToJob(jobInfo.id);
      }, 150);
    }
  };

  const handleAddToCalendar = async (task: TaskDetailsSidebarTask) => {
    try {
      if (!task.date) {
        toast({
          title: "Error",
          description: "Task date is not defined.",
          variant: "destructive",
        });
        return;
      }

      const startDate = new Date();
      const taskDate = new Date(task.date);
      startDate.setFullYear(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getUTCDate(),
      );
      const endDate = new Date(
        startDate.getTime() + (task.requiredHours || 1) * 60 * 60 * 1000,
      );

      const startDateStr =
        startDate.toISOString().replace(/[-:]/g, "").slice(0, -5) + "Z";
      const endDateStr =
        endDate.toISOString().replace(/[-:]/g, "").slice(0, -5) + "Z";

      const response = await fetch("/api/gcal/calendars/prioriwise");
      if (!response.ok) {
        throw new Error("Failed to fetch calendar ID");
      }

      const { calendarId } = await response.json();

      const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${startDateStr}/${endDateStr}&details=${encodeURIComponent(task.notes || '')}&sf=true&output=xml&src=${calendarId}`;

      window.open(googleCalendarUrl, "_blank");

      toast({
        title: "Redirecting to Google Calendar",
        description: "You can now add this event to your calendar.",
      });
    } catch (error) {
      console.error("Error adding task to calendar:", error);
      toast({
        title: "Error",
        description: "Failed to redirect to calendar",
        variant: "destructive",
      });
    }
  };

  const handleAskJija = (task: TaskDetailsSidebarTask) => {
    const jijaUrl = `/jija?jobTitle=${encodeURIComponent(task.title)}`;
    window.location.href = jijaUrl;
  };

  const handleDeleteTask = () => {
    if (!taskDetails || !onDeleteTask) return;
    
    if (window.confirm(`Are you sure you want to delete "${taskDetails.title}"? This action cannot be undone.`)) {
      onDeleteTask(taskDetails.id);
      onOpenChange(false);
    }
  };

  const handleMarkComplete = async (completed: boolean) => {
  if (!taskDetails) return;

  try {
    const response = await fetch(`/api/tasks/${taskDetails.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed }),
    });

    const result = await response.json();

    if (result.success) {
      const updatedTask: TaskDetailsSidebarTask = {
        ...taskDetails,
        ...result.data, // Use all updated fields from API, including endDate and timeElapsed
        completed,
        ...(completed === false ? { endDate: undefined, timeElapsed: undefined } : {}),
      };

      setTaskDetails(updatedTask);

      if (onTaskUpdated) {
        onTaskUpdated(updatedTask);
      }

      if (taskDetails.jobId) {
        const jobRefreshEvent = new CustomEvent('refresh-job-tasks', {
          detail: { jobId: taskDetails.jobId }
        });
        window.dispatchEvent(jobRefreshEvent);
        
        const jobProgressEvent = new CustomEvent('job-progress-update', {
          detail: { jobId: taskDetails.jobId }
        });
        window.dispatchEvent(jobProgressEvent);
      }

      toast({
        title: "Success",
        description: completed ? "Task marked as complete" : "Task marked as incomplete",
      });
    } else {
      throw new Error(result.error || "Failed to update task");
    }
  } catch (error) {
    console.error("Error updating task completion:", error);
    toast({
      title: "Error",
      description: "Failed to update task completion status",
      variant: "destructive",
    });
  }
};

  const handleSetRecurring = async () => {
    if (!taskDetails) return;
    if (!recurringEdit.interval) {
      toast({ title: "Error", description: "Please select a recurrence interval.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/tasks/${taskDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRecurring: true, recurrenceInterval: recurringEdit.interval }),
      });
      const result = await response.json();
      if (result.success) {
        setTaskDetails({ ...taskDetails, isRecurring: true, recurrenceInterval: recurringEdit.interval });
        setRecurringEdit({ isEditing: false, interval: undefined });
        toast({ title: "Success", description: "Task set as recurring." });
      } else {
        throw new Error(result.error || "Failed to update task");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  const handleStopRecurring = async () => {
    if (!taskDetails) return;
    try {
      const response = await fetch(`/api/tasks/${taskDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRecurring: false, recurrenceInterval: null }),
      });
      const result = await response.json();
      if (result.success) {
        setTaskDetails({ ...taskDetails, isRecurring: false, recurrenceInterval: undefined });
        toast({ title: "Success", description: "Task will no longer recur." });
      } else {
        throw new Error(result.error || "Failed to update task");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  const handleTagsChange = (newTags: string[]) => {
    setEditingTags(newTags);
  };

  const renderEditableField = (
    field: EditableField,
    currentValue: any,
    displayValue: string,
    icon: React.ReactNode,
    label: string
  ) => {
    const isEditing = editingField === field;

    return (
      <div className="flex items-start">
        {icon}
        <div className="flex-1">
          <span className="text-xs text-gray-500">{label}</span>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              {field === 'owner' ? (
                <Select value={editingValue} onValueChange={setEditingValue}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {owners.map((owner) => (
                      <SelectItem key={owner._id} value={owner._id}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field === 'focusLevel' ? (
                <Select value={editingValue} onValueChange={setEditingValue}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : field === 'joyLevel' ? (
                <Select value={editingValue} onValueChange={setEditingValue}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : field === 'notes' ? (
                <Textarea
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="text-sm min-h-[60px]"
                  placeholder="Add notes..."
                />
              ) : (
                <Input
                  type={field === 'date' ? 'date' : field === 'requiredHours' ? 'number' : 'text'}
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="h-8 text-sm"
                  placeholder={field === 'requiredHours' ? 'Hours' : ''}
                  min={field === 'requiredHours' ? '0' : undefined}
                  step={field === 'requiredHours' ? 'any' : undefined}
                />
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={saveEdit}
                disabled={isSaving}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
                disabled={isSaving}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 mt-1 transition-colors group relative"
              onClick={() => startEditing(field, currentValue)}
            >
              {field === 'focusLevel' || field === 'joyLevel' ? (
                currentValue ? (
                  <Badge className={field === 'focusLevel' ? getFocusLevelColor(currentValue) : getJoyLevelColor(currentValue)}>
                    {currentValue}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-500">Not set</span>
                )
              ) : (
                <span className="text-sm font-medium">{displayValue}</span>
              )}
              <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                Click to edit
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!selectedTask || !taskDetails) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl overflow-y-auto"
          side="right"
        >
          <SheetHeader className="mb-4">
            {/* Conditional breadcrumb - only show if onNavigateToJob is provided */}
            {jobInfo && onNavigateToJob && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigateToJob}
                  className="text-muted-foreground hover:text-foreground p-1 h-auto"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{jobInfo.title}</span>
                    {jobInfo.jobNumber && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{jobInfo.jobNumber}
                      </span>
                    )}
                  </div>
                </Button>
              </div>
            )}
            <SheetTitle>Task Details</SheetTitle>
            <SheetDescription>
              View and edit task details
            </SheetDescription>
            {/* Helper text for inline editing */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 text-blue-800">
                <Info className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-medium">Tip:</span> Click on any field below to edit it inline. After editing, click ✓ to save.
                </span>
              </div>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <span>Loading task details...</span>
            </div>
          ) : (
            <>
            {/* Action Buttons */}
<div className="mb-6 flex items-center justify-between">
  <div className="flex flex-wrap gap-3">
    {/* Mark Complete/Incomplete Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleMarkComplete(!taskDetails.completed)}
      className={`flex items-center gap-2 ${
        taskDetails.completed 
          ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
          : "text-green-600 hover:text-green-700 hover:bg-green-50"
      }`}
    >
      <Check className="h-4 w-4" />
      {taskDetails.completed ? "Mark as incomplete" : "Mark as complete"}
    </Button>
    
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleAddToCalendar(taskDetails)}
      className="flex items-center gap-2"
    >
      <Calendar className="h-4 w-4" />
      Add to Calendar
    </Button>
    
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleAskJija(taskDetails)}
      className="flex items-center gap-2"
    >
      <PawPrint className="h-4 w-4 text-[#F05523] fill-[#F05523]" />
      Ask Jija
    </Button>
  </div>
  
  {onDeleteTask && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleDeleteTask()}
      className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
      Delete Task
    </Button>
  )}
</div>
              {/* Task Details Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {/* Editable title */}
                    {editingField === 'title' ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="text-lg font-semibold"
                          placeholder="Task title"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span 
                          className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors relative group"
                          onClick={() => startEditing('title', taskDetails.title)}
                        >
                          {taskDetails.title}
                          <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Click to edit
                          </div>
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {taskDetails.isNextTask ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          Next Task
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800">
                          Task
                        </Badge>
                      )}
                      {taskDetails.completed && (
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>




                  {/* Editable Notes Section */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-center mb-2">
                      <FileText className="h-4 w-4 mr-2 text-gray-500" />
                      <h3 className="text-sm font-semibold">Notes</h3>
                    </div>
                    <div className="pl-6">
                      {editingField === 'notes' ? (
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="text-sm min-h-[100px]"
                            placeholder="Add notes..."
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors group relative"
                          onClick={() => startEditing('notes', taskDetails.notes)}
                        >
                          <div 
                            className="text-sm text-muted-foreground" 
                            style={{ 
                              whiteSpace: 'pre-wrap', 
                              overflowY: 'auto', 
                              overflowX: 'hidden', 
                              maxHeight: '10rem', 
                              wordBreak: 'break-word' 
                            }}
                          >
                            {taskDetails.notes || 'Click to add notes...'}
                          </div>
                          <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Click to edit
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Job Information - Editable */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-center mb-2 justify-between">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                        <h3 className="text-sm font-semibold">Job</h3>
                      </div>
                      {jobInfo && onNavigateToJob && (
                        <button
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onOpenChange(false);
                            setTimeout(() => onNavigateToJob(jobInfo.id), 150);
                          }}
                        >
                          View Job
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="pl-6">
                      {editingField === 'job' ? (
                        <div className="flex items-center gap-2">
                          <Select 
                            value={editingValue} 
                            onValueChange={(value) => {
                              if (value === "create") {
                                setIsJobDialogOpen(true);
                              } else {
                                setEditingValue(value);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No job</SelectItem>
                              {Object.entries(jobs)
                                .filter(([id, job]: [string, any]) => !job.isDone)
                                .map(([id, job]: [string, any]) => (
                                <SelectItem key={id} value={id}>
                                  {job.title}
                                </SelectItem>
                              ))}
                              <SelectItem value="create">+ Create New Job</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveEdit}
                            disabled={isSaving}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            disabled={isSaving}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors group relative flex items-center gap-2"
                          onClick={() => startEditing('job', taskDetails.jobId)}
                        >
                          {jobInfo ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{jobInfo.title}</span>
                                {jobInfo.jobNumber && (
                                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    #{jobInfo.jobNumber}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">No job assigned</span>
                          )}
                          <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Click to edit
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editable Task Attributes */}
                  <div className="space-y-4">
                    {/* Top row - Owner and Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderEditableField(
                        'owner',
                        taskDetails.owner,
                        getOwnerName(taskDetails.owner),
                        <User className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                        'Owner'
                      )}

                      {renderEditableField(
                        'date',
                        taskDetails.date,
                        formatDate(taskDetails.date),
                        <Calendar className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                        'Do Date'
                      )}
                    </div>

                    {/* Middle row - Focus and Joy */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderEditableField(
                        'focusLevel',
                        taskDetails.focusLevel,
                        taskDetails.focusLevel || 'Not set',
                        <BarChart className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                        'Focus Level'
                      )}

                      {renderEditableField(
                        'joyLevel',
                        taskDetails.joyLevel,
                        taskDetails.joyLevel || 'Not set',
                        <Heart className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                        'Joy Level'
                      )}
                    </div>

                  {/* Hours Required and Recurring in same row */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex gap-8">
                      {/* Hours Required Section */}
                      <div className="flex-1">
                        {renderEditableField(
                          'requiredHours',
                          taskDetails.requiredHours,
                          taskDetails.requiredHours ? `${taskDetails.requiredHours}h` : 'Not set',
                          <Clock className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                          'Hours Required'
                        )}
                      </div>

                      {/* Recurring Section */}
                      {!taskDetails.completed && (
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <h3 className="text-sm text-gray-600">Recurring</h3>
                          </div>
                          <div className="pl-6">
                            {taskDetails.isRecurring ? (
                              <div className="flex items-center gap-4">
                                <span className="text-sm flex items-center gap-1"><RefreshCcw className="h-4 w-4 inline text-blue-500" />{taskDetails.recurrenceInterval}</span>
                                <Button size="sm" variant="outline" onClick={handleStopRecurring}>Stop Recurring</Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={recurringEdit.interval || ""}
                                    onValueChange={(value) => setRecurringEdit(prev => ({ ...prev, interval: value as RecurrenceInterval }))}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Interval" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="daily">Daily</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="biweekly">Biweekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="quarterly">Quarterly</SelectItem>
                                      <SelectItem value="annually">Annually</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" onClick={handleSetRecurring}>Make Recurring</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                    {/* Editable Tags */}
<div className="flex items-start">
  <Tags className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
  <div className="flex-1">
    <span className="text-xs text-gray-500">Tags</span>
    {editingField === 'tags' ? (
      <div className="mt-1">
        {/* Current tags being edited */}
        <div className="flex flex-wrap gap-1 mb-2">
          {editingTags.map((tag, index) => (
            <Badge 
              key={`editing-${tag}-${index}`} 
              variant="secondary"
              className="text-xs flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        {/* Available tags to add */}
        <div className="mb-2">
          <span className="text-xs text-gray-500 mb-1 block">Available tags:</span>
          <div className="flex flex-wrap gap-1 mb-2">
            {availableTags
              .filter(tag => !editingTags.includes(tag.name))
              .map((tag) => (
                <button
                  key={tag._id}
                  onClick={() => addTag(tag.name)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  {tag.name}
                </button>
              ))}
          </div>
        </div>

          {/* Add new tag */}
          <div className="mb-2">
            <Input
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleNewTagInputKeyDown}
              placeholder="Type new tag and press Enter"
              className="h-8 text-sm"
            />
          </div>

          {/* Save/Cancel buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEditing}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 mt-1 transition-colors group relative"
          onClick={() => startEditing('tags', taskDetails?.tags)}
        >
          {taskDetails?.tags && taskDetails.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {taskDetails.tags.map((tag, index) => (
                <Badge 
                  key={`${tag}-${index}`} 
                  variant="secondary"
                  className="text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500">Click to add tags...</span>
          )}
          <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Click to edit
          </div>
        </div>
      )}
    </div>
  </div>

{/* Non-editable, greyed-out fields for createdDate, endDate, and duration */}
<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
    <Calendar className="h-4 w-4 text-gray-400" />
    <div>
      <div className="text-xs text-gray-500">Created</div>
      <div className="text-sm text-gray-400 select-none">{formatDate((taskDetails.createdDate instanceof Date ? taskDetails.createdDate.toISOString() : taskDetails.createdDate) as string)}</div>
    </div>
  </div>
  {taskDetails.completed && (
    <>
      <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <div>
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-sm text-gray-400 select-none">{taskDetails.endDate ? formatDate((taskDetails.endDate instanceof Date ? taskDetails.endDate.toISOString() : taskDetails.endDate) as string) : '—'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
        <BarChart className="h-4 w-4 text-gray-400" />
        <div>
          <div className="text-xs text-gray-500">Duration</div>
          <div className="text-sm text-gray-400 select-none">{taskDetails.timeElapsed || '—'}</div>
        </div>
      </div>
    </>
  )}
</div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Job Dialog for creating a new job */}
      <JobDialog
        mode="create"
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        onSubmit={handleNewJobSubmit}
      />
    </>
  );
}