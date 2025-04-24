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
import { Plus, PawPrint, Calendar, Briefcase, FileText } from "lucide-react";
import { TaskDialog } from "./tasks-dialog";
import { Task } from "./types";
import { Job } from "@/components/jobs/table/columns";
import { useToast } from "@/hooks/use-toast";
import { NextTaskSelector } from "./next-task-selector";
import { TaskProvider } from "@/hooks/task-context"; // Import the TaskProvider
import { TaskCard } from "./tasks-card"; // Make sure to import the updated TaskCard
import { useTaskContext } from "@/hooks/task-context";
import { useRouter } from "next/navigation";

// Owner interface
interface Owner {
  _id: string;
  name: string;
  userId: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [nextTaskId, setNextTaskId] = useState<string | undefined>(undefined);

  const { toast } = useToast();
  const { refreshJobOwner } = useTaskContext();
  const router = useRouter();

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
        const formattedTasks = result.data.map((task: any) => ({
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
        if (id === nextTaskId) {
          await updateJobNextTask("none");
        }

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

  const handleCompleteTask = async (id: string, jobid:string, completed: boolean) => {
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
        // If the completed task was the next task, we need to update the job--NEW --> This is now taken care of previous call
        // if (completed && id === nextTaskId) {
        //   // Clear the next task since it's now completed
        //   await updateJobNextTask("none");
        // }

        // Use the function form of setState to ensure you're working with the latest state
        setTasks(prevTasks => {
          return prevTasks.map(task => {
            if (task.id === id) {
              // Update completed status and remove isNextTask if it's being completed
              return { 
                ...task, 
                completed,
                // If the task is being completed and it was the next task, remove that status
                isNextTask: completed ? false : task.isNextTask 
              };
            }
            return task;
          });
        });

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
        }))
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
          }))
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
            const event = new CustomEvent('job-progress-update', { 
              detail: { jobId: selectedJob.id } 
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
            const event = new CustomEvent('job-progress-update', { 
              detail: { jobId: selectedJob.id } 
            });
            window.dispatchEvent(event);
          }

          setTasks(
            tasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            )
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

  if (!selectedJob) {
    return null;
  }

  // Sort tasks to show the next task first
  const sortedTasks = [...tasks].sort((a, b) => {
    // If a is the next task, it comes first
    if (a.isNextTask) return -1;
    // If b is the next task, it comes first
    if (b.isNextTask) return 1;
    // Otherwise, keep the original order
    return 0;
  });

  // Format date helper function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    
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
              <SheetDescription>Manage tasks for this job</SheetDescription>
            </SheetHeader>

            {/* Job Details Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedJob.title}</span>
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
                      <div className="text-sm text-muted-foreground" style={{ whiteSpace: 'pre-wrap', overflowY: 'auto', overflowX: 'hidden', maxHeight: '10rem', wordBreak: 'break-word' }}>
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
                        <span className="text-xs text-gray-500">Business Function</span>
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

            {/* Tasks List */}
            {isLoading ? (
              <div className="flex justify-center p-8">
                <p>Loading tasks...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTasks.length > 0 ? (
                  sortedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onComplete={handleCompleteTask}
                      ownerMap={ownerMap}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 border rounded-md">
                    No tasks for this job yet.
                  </div>
                )}
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
        jobId={selectedJob.id}
      />
    </>
  );
}