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
import {
  Plus,
  PawPrint,
  Calendar,
  Briefcase,
  FileText,
  Edit,
  GripVertical,
} from "lucide-react";
import { TaskDialog } from "./tasks-dialog";
import { Task } from "./types";
import { Job } from "@/components/jobs/table/columns";
import { useToast } from "@/hooks/use-toast";
import { NextTaskSelector } from "./next-task-selector";
import { TaskProvider } from "@/hooks/task-context";
import { TaskCard } from "./tasks-card";
import { useTaskContext } from "@/hooks/task-context";
import { useRouter } from "next/navigation";

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
}

// Sortable Task Item component with original UI plus Add to Calendar button
function SortableTaskItem({
  task,
  onEdit,
  onDelete,
  onComplete,
  ownerMap,
  onAddToCalendar,
}: SortableTaskItemProps) {
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
}

export function TasksSidebar({
  open,
  onOpenChange,
  selectedJob,
  onRefreshJobs,
}: TasksSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [nextTaskId, setNextTaskId] = useState<string | undefined>(undefined);
  const [showSaveOrder, setShowSaveOrder] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // Set up sensors for drag operations
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks?jobId=${selectedJob.id}`);
      const result = await response.json();

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
        // Use the function form of setState to ensure you're working with the latest state
        setTasks((prevTasks) => {
          const updatedTasks = prevTasks.map((task) => {
            if (task.id === id){
              return {
                ...task,
                completed,
                isNextTask: completed? false : task.isNextTask,
              };
            }
            return task;
          });

          return updatedTasks.sort((a,b) => {
              if (a.isNextTask && !a.completed) return -1;
              if (b.isNextTask && !b.completed) return 1;

              if (!a.completed && b.completed) return -1;
              if (a.completed && !b.completed) return 1;

              return 0;
          })
        });

        // Then trigger a refresh of the job progress
        refreshJobProgress(jobid);
        setTimeout(() => {
          saveTasksOrderSilently();
        }, 100)
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
   *  * @remarks
   * - Uses spread operator to avoid mutating original tasks array
   * - Comparison function returns -1/1/0 for before/after/equal positioning
   * - Within same completion status, tasks maintain their relative order
   * - Next task loses priority when marked as completed
   * */

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
              <div className="flex justify-between items-center">
                <SheetTitle>Job Tasks</SheetTitle>
                {selectedJob && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Close the sidebar first
                      onOpenChange(false);
                      // Then set the editing job and open the dialog
                      if (selectedJob) {
                        const editEvent = new CustomEvent("open-job-edit", {
                          detail: { job: selectedJob },
                        });
                        window.dispatchEvent(editEvent);
                      }
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit Job
                  </Button>
                )}
              </div>
              <SheetDescription>Manage tasks for this job</SheetDescription>
            </SheetHeader>

            {/* Job Details Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{selectedJob.title}</span>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{selectedJob.jobNumber}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Notes Section */}
                {selectedJob.notes && (
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-center mb-2">
                      <FileText className="h-4 w-4 mr-2 text-gray-500" />
                      <h3 className="text-sm font-semibold">Notes</h3>
                    </div>
                    <div className="pl-6">
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
                        {selectedJob.notes}
                      </div>
                    </div>
                  </div>
                )}

                {/* Job Attributes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Business Function */}
                  {selectedJob.businessFunctionName && (
                    <div className="flex items-start">
                      <Briefcase className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <span className="text-xs text-gray-500">
                          Business Function
                        </span>
                        <p className="text-sm font-medium">
                          {selectedJob.businessFunctionName}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Due Date */}
                  {selectedJob.dueDate && (
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <span className="text-xs text-gray-500">Due Date</span>
                        <p className="text-sm font-medium">
                          {formatDate(selectedJob.dueDate)}
                        </p>
                      </div>
                    </div>
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
                <p className="text-sm mb-2">Save the new task order?</p>
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
        jobId={selectedJob?.id ?? ""}
      />
    </>
  );
}