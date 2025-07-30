"use client";

import { useState, useEffect, useRef } from "react";
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
  Plus,
  PawPrint,
  Calendar,
  Briefcase,
  FileText,
  GripVertical,
  Check,
  X,
  Info,
  Trash2,
} from "lucide-react";
import { TaskDialog } from "./tasks-dialog-jobselector";
import { Task } from "./types";
import { Job } from "@/components/jobs/table/columns";
import { useToast } from "@/hooks/use-toast";
import { NextTaskSelector } from "./next-task-selector";
import { TaskProvider } from "@/hooks/task-context";
import { TaskCard } from "./tasks-card";
import { useTaskContext } from "@/hooks/task-context";
import { useRouter } from "next/navigation";
import { TaskDetailsSidebar } from "@/components/tasks/task-details-sidebar";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Owner interface
interface Owner {
  _id: string;
  name: string;
  userId: string;
}

// Define proper types for the SortableTaskItem props
interface SortableTaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string, jobid: string, completed: boolean) => void;
  ownerMap: Record<string, string>;
  onAddToCalendar?: (task: Task) => void;
  onOpenTaskDetails?: (task: Task) => void;
}
type EditableJobField = 'title' | 'dueDate' | 'notes' | 'businessFunction';

// Sortable Task Item component with original UI plus Add to Calendar button
function SortableTaskItem({
  task,
  onEdit,
  onDelete,
  onComplete,
  ownerMap,
  onAddToCalendar,
  onOpenTaskDetails,
  onToggleMyDay,
}: SortableTaskItemProps & { onToggleMyDay?: (task: Task, value: boolean) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: task.isNextTask,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Patch: Compose TaskCard's action area with add-to-calendar button if present
  // We'll render TaskCard as normal, and if onAddToCalendar exists, we render the button after TaskCard.
  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div className="flex items-start">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={`flex items-center justify-center h-full min-h-[80px] px-2 ${
            task.isNextTask ? "opacity-20 cursor-not-allowed" : "cursor-grab"
          }`}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1 relative">
          <TaskCard
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
            ownerMap={ownerMap}
            onAddToCalendar={onAddToCalendar}
            onOpenTaskDetails={onOpenTaskDetails}
            onToggleMyDay={onToggleMyDay}
          />
        </div>
      </div>
    </div>
  );
}

interface TasksSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJob: Job | null;
  onRefreshJobs?: () => void; // Simple callback to refresh jobs data
  onDeleteJob?: (jobId: string) => void;
  jobs?: Record<string, any>;
  onTaskCreated?: (newTask: any) => void;
  onTaskUpdated?: (updatedTask: any) => void;
  onTaskDeleted?: (deletedTaskId: string, jobId?: string) => void;
}

export function TasksSidebar({
  open,
  onOpenChange,
  selectedJob,
  onRefreshJobs,
  onDeleteJob,
  jobs,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: TasksSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [businessFunctions, setBusinessFunctions] = useState<{ _id: string; name: string }[]>([]);
  const [nextTaskId, setNextTaskId] = useState<string | undefined>(undefined);
  const [showSaveOrder, setShowSaveOrder] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [taskDetailsSidebarOpen, setTaskDetailsSidebarOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);

  // Job inline editing state
  const [editingJobField, setEditingJobField] = useState<EditableJobField | null>(null);
  const [editingJobValue, setEditingJobValue] = useState<string>('');
  const [isSavingJob, setIsSavingJob] = useState(false);

  // This flag will track if we've already done the initial sort
  const initialSortDoneRef = useRef(false);

  const { toast } = useToast();
  const { refreshJobOwner, refreshJobProgress } = useTaskContext();
  const router = useRouter();

  // Reset the initialSortDone flag when the sidebar is closed
  useEffect(() => {
    if (!open) {
      initialSortDoneRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    const handleJobTasksRefresh = (event: CustomEvent) => {
      if (selectedJob && event.detail.jobId === selectedJob.id) {
        console.log(`Refreshing tasks for job ${selectedJob.id} due to job change`);
        fetchTasks();
      }
    };

    const handleJobProgressUpdate = (event: CustomEvent) => {
      if (selectedJob && event.detail.jobId === selectedJob.id) {
        console.log(`Job progress updated for job ${selectedJob.id}`);
        fetchTasks();
      }
    };

    window.addEventListener('refresh-job-tasks', handleJobTasksRefresh as EventListener);
    window.addEventListener('job-progress-update', handleJobProgressUpdate as EventListener);

    return () => {
      window.removeEventListener('refresh-job-tasks', handleJobTasksRefresh as EventListener);
      window.removeEventListener('job-progress-update', handleJobProgressUpdate as EventListener);
    };
  }, [selectedJob]);

  // Set up sensors for drag operations
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTaskForDetails(task);
    setTaskDetailsSidebarOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    
    if (updatedTask.isNextTask && typeof onRefreshJobs === "function") {
      onRefreshJobs();
    }
  };

  const handleTaskDetailsSidebarClose = (open: boolean) => {
    setTaskDetailsSidebarOpen(open);
    
    if (!open && selectedJob) {
      console.log('Task details sidebar closed, refreshing tasks');
      fetchTasks();
    }
  };

  const handleNavigateToJob = (jobId: string) => {
    console.log('TasksSidebar handleNavigateToJob called with jobId:', jobId);
    console.log('Current selectedJob:', selectedJob?.id);
    console.log('Available jobs in jobs map:', Object.keys(jobs || {}));
    
    // If the jobId is different from the current selected job, we need to navigate
    if (selectedJob && jobId !== selectedJob.id) {
      console.log('Navigating to different job:', jobId);
      // Find the job in the jobs map
      const targetJob = jobs?.[jobId];
      if (targetJob) {
        console.log('Found target job:', targetJob.title);
        // Close the current sidebar and task details
        setSelectedTaskForDetails(null);
        onOpenChange(false);
        
        // Dispatch an event to open the tasks sidebar for the new job
        // This will be handled by the parent component (job-feed-view)
        const event = new CustomEvent('open-tasks-sidebar', {
          detail: { jobId, jobData: targetJob }
        });
        window.dispatchEvent(event);
        console.log('Dispatched open-tasks-sidebar event for jobId:', jobId);
      } else {
        console.log('Target job not found in jobs map');
        console.log('Jobs map keys:', Object.keys(jobs || {}));
        
        // Fallback: try to dispatch the event anyway, let the parent handle it
        const event = new CustomEvent('open-tasks-sidebar', {
          detail: { jobId }
        });
        window.dispatchEvent(event);
        console.log('Dispatched open-tasks-sidebar event without job data for jobId:', jobId);
      }
    } else {
      console.log('Same job, just closing task details sidebar');
      // Same job, just close the task details sidebar
      setSelectedTaskForDetails(null);
    }
  };

  const handleMarkJobComplete = async (completed: boolean) => {
  if (!selectedJob) return;

  try {
    const response = await fetch(`/api/jobs/${selectedJob.id}?updateTasks=true`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isDone: completed }),
    });

    const result = await response.json();

    if (result.success) {
      Object.assign(selectedJob, {
        ...selectedJob,
        isDone: completed,
      });

      if (typeof onRefreshJobs === "function") {
        onRefreshJobs();
        
        const refreshEvent = new CustomEvent('force-jobs-refresh', {
          detail: { jobId: selectedJob.id, completed }
        });
        window.dispatchEvent(refreshEvent);
      }

      toast({
        title: "Success",
        description: completed ? "Job marked as complete" : "Job marked as active",
      });

      if (completed) {
        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
      }
    } else {
      throw new Error(result.error || "Failed to update job");
    }
  } catch (error) {
    console.error("Error updating job completion:", error);
    toast({
      title: "Error",
      description: "Failed to update job completion status",
      variant: "destructive",
    });
  }
};

  const startEditingJob = (field: EditableJobField, currentValue: any) => {
    setEditingJobField(field);
    
    switch (field) {
      case 'dueDate':
        if (currentValue) {
          const date = new Date(currentValue);
          setEditingJobValue(date.toISOString().split('T')[0]);
        } else {
          setEditingJobValue('');
        }
        break;
      case 'businessFunction':
        setEditingJobValue(currentValue || 'none');
        break;
      default:
        setEditingJobValue(currentValue || '');
    }
  };

  const cancelEditingJob = () => {
    setEditingJobField(null);
    setEditingJobValue('');
  };

  const saveJobEdit = async () => {
    if (!selectedJob || !editingJobField) return;

    setIsSavingJob(true);
    try {
      const updateData: any = {};
      
      switch (editingJobField) {
        case 'title':
          updateData.title = editingJobValue;
          break;
        case 'dueDate':
          updateData.dueDate = editingJobValue ? `${editingJobValue}T00:00:00.000Z` : null;
          break;
        case 'notes':
          updateData.notes = editingJobValue;
          break;
        case 'businessFunction':
          updateData.businessFunctionId = editingJobValue === 'none' ? null : editingJobValue;
          break;
      }

      console.log('Updating job with data:', updateData);

      const response = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      console.log('Job update result:', result);

      if (result.success) {
        Object.assign(selectedJob, {
          ...selectedJob,
          ...updateData,
        });

        if (editingJobField === 'businessFunction') {
          const selectedBF = businessFunctions.find(bf => bf._id === editingJobValue);
          if (selectedBF) {
            selectedJob.businessFunctionName = selectedBF.name;
          } else if (editingJobValue === 'none') {
            selectedJob.businessFunctionName = undefined;
          }
        }

        if (typeof onRefreshJobs === "function") {
          onRefreshJobs();
        }

        toast({
          title: "Success",
          description: "Job updated successfully",
        });

        setEditingJobField(null);
        setEditingJobValue('');
      } else {
        throw new Error(result.error || "Failed to update job");
      }
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleAskJija = () => {
    if (!selectedJob) return;
    const params = new URLSearchParams();
    params.set("source", "job");
    if (selectedJob.id) params.set("jobId", selectedJob.id);
    if (selectedJob.title) params.set("jobTitle", selectedJob.title);
    const jijaUrl = `/jija?${params.toString()}`;
    window.location.href = jijaUrl;
  };

  const handleDeleteJob = () => {
    if (!selectedJob || !onDeleteJob) return;
    
    if (window.confirm(`Are you sure you want to delete "${selectedJob.title}"? This action cannot be undone and will also delete all associated tasks.`)) {
      onDeleteJob(selectedJob.id);
      onOpenChange(false);
    }
  };

  // Fetch owners from API
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const response = await fetch("/api/owners");

        if (!response.ok) {
          throw new Error(`Failed to fetch owners: ${response.status}`);
        }

        const ownersData = await response.json();
        setOwners(ownersData);

        // Create a mapping from owner ID to owner name
        const mapping: Record<string, string> = {};
        ownersData.forEach((owner: Owner) => {
          mapping[owner._id] = owner.name;
        });
        setOwnerMap(mapping);
      } catch (error) {
        console.error("Error fetching owners:", error);
        toast({
          title: "Error",
          description: "Failed to fetch owners list",
          variant: "destructive",
        });
      }
    };

    fetchOwners();
  }, [toast]);

  useEffect(() => {
    const fetchBusinessFunctions = async () => {
      try {
        const response = await fetch("/api/business-functions");

        if (!response.ok) {
          throw new Error(`Failed to fetch business functions: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
          setBusinessFunctions(result.data);
        }
      } catch (error) {
        console.error("Error fetching business functions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch business functions list",
          variant: "destructive",
        });
      }
    };

    fetchBusinessFunctions();
  }, [toast]);

  // Fetch tasks when job changes
  useEffect(() => {
    if (selectedJob) {
      // Reset the initialSortDone flag when the job changes
      initialSortDoneRef.current = false;
      fetchTasks();
      // Set the next task ID from the job
      setNextTaskId(selectedJob.nextTaskId);
    } else {
      setTasks([]);
      setNextTaskId(undefined);
    }
  }, [selectedJob]);

  const fetchTasks = async () => {
    if (!selectedJob) return;
    let jobId: string | undefined = undefined;
    if ('id' in selectedJob && selectedJob.id) {
      jobId = selectedJob.id;
    } else if ('_id' in selectedJob && (selectedJob as any)._id) {
      jobId = (selectedJob as any)._id;
    }
    if (!jobId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks?jobId=${jobId}`);
      const result = await response.json();
      console.log('TasksSidebar: API response for /api/tasks?jobId=', jobId, result);

      if (result.success) {
        // Map from MongoDB _id to id for frontend consistency
        let formattedTasks = result.data.map((task: any) => ({
          id: task._id,
          title: task.title,
          owner: task.owner,
          date: task.date,
          requiredHours: task.requiredHours,
          focusLevel: task.focusLevel,
          joyLevel: task.joyLevel,
          notes: task.notes,
          tags: task.tags || [],
          jobId: task.jobId,
          completed: task.completed,
          isNextTask: task._id === selectedJob.nextTaskId,
          createdDate: task.createdDate,
          endDate: task.endDate,
          timeElapsed: task.timeElapsed,
          isRecurring: task.isRecurring,
          recurrenceInterval: task.recurrenceInterval,
          myDay: task.myDay,
          myDayDate: task.myDayDate,
        }));

        // On initial load, sort tasks based on job.tasks array
        if (
          !initialSortDoneRef.current &&
          selectedJob.tasks &&
          Array.isArray(selectedJob.tasks)
        ) {
          console.log("Performing initial sort based on job.tasks order");
          console.log("Job tasks array:", selectedJob.tasks);

          // Sort tasks according to job.tasks array order
          formattedTasks.sort((a: any, b: any) => {
            // Next task always comes first
            if (a.isNextTask) return -1;
            if (b.isNextTask) return 1;

            // Then use the job.tasks array order
            const aIndex = selectedJob.tasks
              ? selectedJob.tasks.indexOf(a.id)
              : -1;
            const bIndex = selectedJob.tasks
              ? selectedJob.tasks.indexOf(b.id)
              : -1;

            // If both tasks are in the tasks array, sort by their index
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }

            // If only a is in the tasks array, prioritize it
            if (aIndex !== -1) return -1;

            // If only b is in the tasks array, prioritize it
            if (bIndex !== -1) return 1;

            return 0;
          });

          initialSortDoneRef.current = true;
        }

        setTasks(formattedTasks);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = () => {
    setDialogMode("create");
    setCurrentTask(undefined);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setDialogMode("edit");
    setCurrentTask(task);
    setTaskDialogOpen(true);
  };

  const handleTaskSubmit = async (taskData: Partial<Task>) => {
    try {
      // Make sure tags is always defined as an array
      const processedTaskData = {
        ...taskData,
        tags: taskData.tags || [],
      };

      if (dialogMode === "create") {
        // Create new task
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedTaskData),
        });

        const result = await response.json();

        if (result.success) {
          // Map from MongoDB _id to id for frontend consistency
          const newTask: Task = {
            id: result.data._id,
            title: result.data.title,
            owner: result.data.owner,
            date: result.data.date,
            requiredHours: result.data.requiredHours,
            focusLevel: result.data.focusLevel,
            joyLevel: result.data.joyLevel,
            notes: result.data.notes,
            tags: result.data.tags || [],
            jobId: result.data.jobId,
            completed: result.data.completed,
            isNextTask: false,
            createdDate: result.data.createdDate,
            endDate: result.data.endDate,
            timeElapsed: result.data.timeElapsed,
          };

          // Add task ID to job's tasks array
          if (selectedJob) {
            await updateJobTasks([...tasks.map((t) => t.id), newTask.id]);

            // Trigger a refresh of the job progress since we added a new task
            const event = new CustomEvent("job-progress-update", {
              detail: { jobId: selectedJob.id },
            });
            window.dispatchEvent(event);
          }

          setTasks([...tasks, newTask]);
          
          // Call the callback to notify parent component
          if (onTaskCreated) {
            onTaskCreated(newTask);
          }
          
          toast({
            title: "Success",
            description: "Task created successfully",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create task",
            variant: "destructive",
          });
        }
      } else {
        // Update existing task
        if (!currentTask) return;

        const response = await fetch(`/api/tasks/${currentTask.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedTaskData),
        });

        const result = await response.json();

        if (result.success) {
          // Map from MongoDB _id to id for frontend consistency
          const updatedTask: Task = {
            id: result.data._id,
            title: result.data.title,
            owner: result.data.owner,
            date: result.data.date,
            requiredHours: result.data.requiredHours,
            focusLevel: result.data.focusLevel,
            joyLevel: result.data.joyLevel,
            notes: result.data.notes,
            tags: result.data.tags || [],
            jobId: result.data.jobId,
            completed: result.data.completed,
            isNextTask: result.data._id === nextTaskId,
            createdDate: result.data.createdDate,
            endDate: result.data.endDate,
            timeElapsed: result.data.timeElapsed,

          };

          // If the task completion status changed, trigger a progress update
          if (currentTask.completed !== updatedTask.completed && selectedJob) {
            const event = new CustomEvent("job-progress-update", {
              detail: { jobId: selectedJob.id },
            });
            window.dispatchEvent(event);
          }

           // Add this check: If the edited task is the next task, trigger a refresh
          if (updatedTask.isNextTask && typeof onRefreshJobs === "function") {
            onRefreshJobs();
          }

          setTasks(
            tasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task,
            ),
          );

          // Call the callback to notify parent component
          if (onTaskUpdated) {
            onTaskUpdated(updatedTask);
          }

          toast({
            title: "Success",
            description: "Task updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to update task",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      toast({
        title: "Error",
        description: "Failed to submit task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // If the deleted task was the next task, we need to update the job
        // if (id === nextTaskId) {
        //   await updateJobNextTask("none");
        // }

        setTasks(tasks.filter((task) => task.id !== id));
        
        // Call the callback to notify parent component
        if (onTaskDeleted) {
          onTaskDeleted(id, selectedJob?.id);
        }
        
        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = async (
    id: string,
    jobid: string,
    completed: boolean,
  ) => {
    try {
      const response = await fetch(`/api/jobs/${jobid}/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
      });
      const result = await response.json();
      if (result.success) {
        const updatedTaskData = result.data;
      // Use the function form of setState to ensure you're working with the latest state
        setTasks((prevTasks) => {
          const updatedTasks = prevTasks.map((task) => {
            if (task.id === id) {
              const updatedTask = {
                ...task,
                completed: updatedTaskData.completed,
                isNextTask: completed ? false : task.isNextTask,
                createdDate: updatedTaskData.createdDate || task.createdDate,
                endDate: updatedTaskData.endDate,
                timeElapsed: updatedTaskData.timeElapsed,
              };
              
              // Call the callback to notify parent component
              if (onTaskUpdated) {
                onTaskUpdated(updatedTask);
              }
              
              return updatedTask;
            }
            return task;
          });

          return updatedTasks.sort((a, b) => {
            if (a.isNextTask && !a.completed) return -1;
            if (b.isNextTask && !b.completed) return 1;


            if (!a.completed && b.completed) return -1;
            if (a.completed && !b.completed) return 1;

            return 0;
          });
        });

        // Then trigger a refresh of the job progress
        refreshJobProgress(jobid);
        setTimeout(() => {
          saveTasksOrderSilently();
        }, 100);
        await fetchTasks();
      } else {
        toast({
          title: "Error",
          description: "Failed to update task",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleNextTaskChange = async (taskId: string): Promise<void> => {
    if (!selectedJob) return;

    try {
      // Update the job with the new next task ID
      const taskIdToSave = taskId === "none" ? null : taskId;

      const response = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nextTaskId: taskIdToSave }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Update local state
      setNextTaskId(taskIdToSave || undefined);

      // Update isNextTask flag for all tasks
      setTasks(
        tasks.map((task) => ({
          ...task,
          isNextTask: task.id === taskIdToSave,
        })),
      );

      // Set the flag in the parent component to indicate a refresh is needed
      // But don't actually refresh yet - wait until sidebar is closed
      if (typeof onRefreshJobs === "function") {
        onRefreshJobs();
      }

      toast({
        title: "Success",
        description: "Next task updated successfully",
      });
    } catch (error) {
      console.error("Error updating next task:", error);
      toast({
        title: "Error",
        description: "Failed to update next task",
        variant: "destructive",
      });
    }
  };

  const updateJobNextTask = async (taskId: string): Promise<void> => {
    if (!selectedJob) return;

    try {
      const taskIdToSave = taskId === "none" ? null : taskId;

      const response = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nextTaskId: taskIdToSave }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setNextTaskId(taskIdToSave || undefined);

        // Update isNextTask flag for all tasks
        setTasks(
          tasks.map((task) => ({
            ...task,
            isNextTask: task.id === taskIdToSave,
          })),
        );

        // Set flag for refresh on close
        if (typeof onRefreshJobs === "function") {
          onRefreshJobs();
        }
      } else {
        throw new Error(result.error || "Failed to update next task");
      }
    } catch (error) {
      console.error("Error updating next task:", error);
      throw error;
    }
  };

  const updateJobTasks = async (taskIds: string[]): Promise<void> => {
    if (!selectedJob) return;

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tasks: taskIds }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update job tasks");
      }
    } catch (error) {
      console.error("Error updating job tasks:", error);
      throw error;
    }
  };

  // Handle drag end with proper typing
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      // Find the task that was being dragged
      const draggedTask = tasks.find((task) => task.id === active.id);
      const targetTask = tasks.find((task) => task.id === over.id);

      // Don't allow the next task to be reordered
      if (draggedTask && draggedTask.isNextTask) {
        toast({
          title: "Cannot reorder next task",
          description: "The next task must remain at the top",
          variant: "destructive",
        });
        setActiveId(null);
        return;
      }

      if (draggedTask && targetTask && draggedTask.completed !== targetTask.completed) {
        toast({
          title: "Cannot reorder between completion statuses",
          description: "Completed and incomplete tasks must stay in their respective sections",
          variant: "destructive",
        });
        setActiveId(null);
        return;
      }

      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newTasks = arrayMove(items, oldIndex, newIndex);
        setShowSaveOrder(true);
        return newTasks;
      });
    }

    setActiveId(null);
  };

  /**
   * Saves the current task order to the backend without showing user feedback.
   * This function is used for automatic saves (e.g., after task completion status changes)
   * where we don't want to show toast notifications or other UI feedback to the user.
   * 
   * @async
   * @function saveTasksOrderSilently
   * @returns {Promise<void>} A promise that resolves when the save operation completes
   * 
   * @description
   * - Gets the current task IDs in their display order
   * - Sends a PUT request to update the job's task order in the backend
   * - Updates the local selectedJob object with the new task order
   * - Triggers a job refresh if the onRefreshJobs callback is available
   * - Logs errors to console but doesn't show user notifications
   * 
   * @example
   * // Typically called after task completion status changes
   * setTimeout(() => {
   *   saveTasksOrderSilently();
   * }, 100);
   */
  const saveTasksOrderSilently = async () => {
    if (!selectedJob) return;

    try {
      const taskIds = tasks.map((task) => task.id);
      
      const response = await fetch("/api/tasks/order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          taskIds: taskIds,
        }),
      });

      const result = await response.json();
      if (result.success && selectedJob) {
        Object.assign(selectedJob, { ...selectedJob, tasks: taskIds });
        if (typeof onRefreshJobs === "function") {
          onRefreshJobs();
        }
      }
    } catch (error) {
      console.error("Error saving task order silently:", error);
    }
  };

  // Save the new order of tasks
  const saveTasksOrder = async () => {
    if (!selectedJob) return;

    try {
      // Get all task IDs in their current order
      const taskIds = tasks.map((task) => task.id);

      // Log the order we're about to save
      console.log("Saving task order:", taskIds);

      // Call the API endpoint
      const response = await fetch("/api/tasks/order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          taskIds: taskIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowSaveOrder(false);

        toast({
          title: "Success",
          description: "Task order updated successfully",
        });

        // Update the local selectedJob object with the new task order
        if (selectedJob) {
          // Create a copy of the job with updated tasks array
          const updatedJob = {
            ...selectedJob,
            tasks: taskIds,
          };

          // Replace the selectedJob reference (this won't update the parent component,
          // but it will ensure the correct order if we need to use it locally)
          Object.assign(selectedJob, updatedJob);
        }

        // Refresh jobs if needed
        if (typeof onRefreshJobs === "function") {
          onRefreshJobs();
        }
      } else {
        throw new Error(result.error || "Failed to update task order");
      }
    } catch (error) {
      console.error("Error saving task order:", error);
      toast({
        title: "Error",
        description: "Failed to save task order",
        variant: "destructive",
      });
    }
  };

  // Add to Calendar
  const handleAddToCalendar = async (task: any) => {
    try {
      if (!task.date) {
        toast({
          title: "Error",
          description: "Task date is not defined.",
          variant: "destructive",
        });
        return;
      }

      // Use current local time as the start time
      const startDate = new Date();
      const taskDate = new Date(task.date);
      // Keep the date from the task but use current time
      startDate.setFullYear(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getUTCDate(),
      );
      const endDate = new Date(
        startDate.getTime() + task.requiredHours * 60 * 60 * 1000,
      );

      const startDateStr =
        startDate.toISOString().replace(/[-:]/g, "").slice(0, -5) + "Z";
      const endDateStr =
        endDate.toISOString().replace(/[-:]/g, "").slice(0, -5) + "Z";

      // Fetch the calendar ID from the server
      const response = await fetch("/api/gcal/calendars/prioriwise"); // or your actual route
      if (!response.ok) {
        throw new Error("Failed to fetch calendar ID");
      }

      const { calendarId } = await response.json();

      // Construct Google Calendar URL
      const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${startDateStr}/${endDateStr}&details=${encodeURIComponent(task.description)}&sf=true&output=xml&src=${calendarId}`;

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

  const renderEditableJobField = (
    field: EditableJobField,
    currentValue: any,
    displayValue: string,
    icon: React.ReactNode,
    label: string,
    isTextarea: boolean = false,
    isSelect: boolean = false
  ) => {
    const isEditing = editingJobField === field;

    return (
      <div className="flex items-start">
        {icon}
        <div className="flex-1">
          <span className="text-xs text-gray-500">{label}</span>
          {isEditing ? (
            <div className="flex items-start gap-2 mt-1">
              {isSelect ? (
                <Select value={editingJobValue} onValueChange={setEditingJobValue}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No business function</SelectItem>
                    {businessFunctions.map((bf) => (
                      <SelectItem key={bf._id} value={bf._id}>
                        {bf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : isTextarea ? (
                <Textarea
                  value={editingJobValue}
                  onChange={(e) => setEditingJobValue(e.target.value)}
                  className="text-sm min-h-[60px]"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                />
              ) : (
                <Input
                  type={field === 'dueDate' ? 'date' : 'text'}
                  value={editingJobValue}
                  onChange={(e) => setEditingJobValue(e.target.value)}
                  className="h-8 text-sm"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                />
              )}
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={saveJobEdit}
                  disabled={isSavingJob}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditingJob}
                  disabled={isSavingJob}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 mt-1 transition-colors group relative"
              onClick={() => startEditingJob(field, currentValue)}
            >
              <p className="text-sm font-medium">{displayValue}</p>
              <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                Click to edit
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!selectedJob) {
    return null;
  }

  /**
   * Sorted array of tasks with automatic prioritization based on completion status.
   * 
   * @description
   * Creates a new sorted array from the tasks state with the following priority order:
   * 1. Next Task (if incomplete) - Always appears first
   * 2. Other incomplete tasks - Appear in middle section
   * 3. Completed tasks - Automatically moved to bottom
   * 
   * This ensures users always see their next priority task at the top and don't need
   * to scroll through completed tasks to find incomplete work.
   * @remarks
   * - Uses spread operator to avoid mutating original tasks array
   * - Comparison function returns -1/1/0 for before/after/equal positioning
   * - Within same completion status, tasks maintain their relative order
   * - Next task loses priority when marked as completed
   */

  // Sort tasks - only prioritize the next task, allowing drag and drop to manage the rest
  const sortedTasks = [...tasks].sort((a, b) => {
    // Next task always comes first
    if (a.isNextTask && !a.completed) return -1;
    if (b.isNextTask && !b.completed) return 1;

    if (!a.completed && b.completed) return -1;
    if (a.completed && !b.completed) return 1;

    // For all other tasks, keep their current order
    return 0;
  });

  // Format date helper function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";

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

  const handleToggleMyDay = async (task: Task, value: boolean) => {
    const today = new Date().toLocaleDateString('en-CA');
    try {
      await fetch(`/api/tasks/${task.id || (task as any)._id}/myday`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myDay: value, myDayDate: value ? today : null }),
      });
      if (typeof fetchTasks === 'function') fetchTasks();
    } catch (err) {
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl overflow-y-auto"
          side="right"
        >
          {/* Wrap the content with the TaskProvider */}
          <TaskProvider>
            <SheetHeader className="mb-4">
              <SheetTitle>Job Tasks</SheetTitle>
              <SheetDescription>
                Manage tasks for this job
              </SheetDescription>
              {/* Helper text for inline editing*/}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 text-blue-800">
                  <Info className="h-4 w-4" />
                  <span className="text-sm">
                    <span className="font-medium">Tip:</span> Click on the job details below to edit them inline. After editing, click ✓ to save.
                  </span>
                </div>
              </div>
            </SheetHeader>

            {/* Quick Action Buttons */}
<div className="mb-6 flex items-center justify-between">
  <div className="flex flex-wrap gap-3">
    {/* Mark Job Complete/Active Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleMarkJobComplete(!selectedJob.isDone)}
      className={`flex items-center gap-2 ${
        selectedJob.isDone 
          ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
          : "text-green-600 hover:text-green-700 hover:bg-green-50"
      }`}
    >
      <Check className="h-4 w-4" />
      {selectedJob.isDone ? "Mark job as active" : "Mark job as complete"}
    </Button>
    
    <Button
      variant="outline"
      size="sm"
      onClick={handleAskJija}
      className="flex items-center gap-2"
    >
      <PawPrint className="h-4 w-4 text-[#F05523] fill-[#F05523]" />
      Ask Jija
    </Button>
  </div>
  
  {onDeleteJob && (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDeleteJob}
      className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
      Delete Job
    </Button>
  )}
</div>

            {/* Job Details Card with Inline Editing */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Editable Job Title */}
                    {editingJobField === 'title' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingJobValue}
                          onChange={(e) => setEditingJobValue(e.target.value)}
                          className="text-lg font-semibold"
                          placeholder="Job title"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={saveJobEdit}
                          disabled={isSavingJob}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditingJob}
                          disabled={isSavingJob}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span 
                        className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors relative group"
                        onClick={() => startEditingJob('title', selectedJob.title)}
                      >
                        {selectedJob.title}
                        <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Click to edit
                        </div>
                      </span>
                    )}
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{selectedJob.jobNumber}
                    </span>
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
                    {editingJobField === 'notes' ? (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={editingJobValue}
                          onChange={(e) => setEditingJobValue(e.target.value)}
                          className="text-sm min-h-[100px]"
                          placeholder="Add notes..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveJobEdit}
                            disabled={isSavingJob}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingJob}
                            disabled={isSavingJob}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors group relative"
                        onClick={() => startEditingJob('notes', selectedJob.notes)}
                      >
                        <div
                          className="text-sm text-muted-foreground"
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowY: "auto",
                            overflowX: "hidden",
                            maxHeight: "10rem",
                            wordBreak: "break-word",
                          }}
                        >
                          {selectedJob.notes || "Click to add notes..."}
                        </div>
                        <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Click to edit
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Attributes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Editable Business Function */}
                  {renderEditableJobField(
                    'businessFunction',
                    selectedJob.businessFunctionId,
                    selectedJob.businessFunctionName || 'No business function',
                    <Briefcase className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                    'Business Function',
                    false,
                    true
                  )}

                  {/* Editable Due Date */}
                  {renderEditableJobField(
                    'dueDate',
                    selectedJob.dueDate,
                    formatDate(selectedJob.dueDate),
                    <Calendar className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />,
                    'Due Date'
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Next Task Selector */}
            {tasks.length > 0 && (
              <NextTaskSelector
                tasks={tasks}
                onNextTaskChange={handleNextTaskChange}
                currentNextTaskId={nextTaskId}
              />
            )}

            {/* Add Task Button */}
            <div className="mb-4">
              <Button onClick={handleAddTask} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>

            {/* Tasks List with DnD Kit */}
            {isLoading ? (
              <div className="flex justify-center p-8">
                <p>Loading tasks...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTasks.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(event) =>
                      setActiveId(event.active.id.toString())
                    }
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedTasks.map((task) => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedTasks.map((task) => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onComplete={handleCompleteTask}
                          ownerMap={ownerMap}
                          onAddToCalendar={handleAddToCalendar}
                          onOpenTaskDetails={handleOpenTaskDetails}
                          onToggleMyDay={handleToggleMyDay}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="p-8 text-center text-gray-500 border rounded-md">
                    No tasks for this job yet.
                  </div>
                )}
              </div>
            )}

            {/* Save Order Notification */}
            {showSaveOrder && (
              <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border border-gray-200">
                <span className="text-sm mb-2 block">Save the new task order?</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Revert the changes
                      fetchTasks();
                      setShowSaveOrder(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveTasksOrder}>
                    Save Order
                  </Button>
                </div>
              </div>
            )}
          </TaskProvider>
        </SheetContent>
      </Sheet>

      {/* Task Dialog for creating/editing tasks */}
      <TaskDialog
        mode={dialogMode}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSubmit={handleTaskSubmit}
        initialData={currentTask}
        jobs={jobs}
        jobId={selectedJob?.id}
      />

      {/* Task Details Sidebar */}
      <TaskDetailsSidebar
        open={taskDetailsSidebarOpen}
        onOpenChange={handleTaskDetailsSidebarClose}
        selectedTask={selectedTaskForDetails}
        onTaskUpdated={handleTaskUpdated}
        onNavigateToJob={handleNavigateToJob}
        onDeleteTask={handleDeleteTask}
      />
    </>
  );
}