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
import { Plus } from "lucide-react";
import { TaskDialog } from "@/components/tasks/tasks-dialog";
import { Task } from "@/components/tasks/types";
import { useToast } from "@/hooks/use-toast";
import { TaskProvider } from "@/hooks/task-context";
import { TaskCards } from "@/components/tasks/table/task-grid";
import { useTaskContext } from "@/hooks/task-context";

// Define interface for search result items
interface SearchResultItem {
  id?: string;
  _id?: string;
  title: string;
  notes?: string;
  type?: string;
  businessFunctionName?: string;
  businessFunctionId?: string;
  dueDate?: string;
  date?: string; // For tasks (do date)
  nextTaskId?: string;
  jobId?: string;
  tasks?: string[];
  owner?: string;
  focusLevel?: string;
  joyLevel?: string;
  requiredHours?: number;
}

// Business function interface
interface BusinessFunction {
  id: string;
  name: string;
}

// Owner interface
interface Owner {
  _id: string;
  name: string;
}

// Props interface
interface TasksSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: SearchResultItem | null;
  onRefreshJobs?: () => void;
}

export function TasksSidebar({
  open,
  onOpenChange,
  selectedItem,
  onRefreshJobs,
}: TasksSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [businessFunctions, setBusinessFunctions] = useState<BusinessFunction[]>([]);
  const [businessFunctionMap, setBusinessFunctionMap] = useState<Record<string, string>>({});
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [taskDialogOpen, setTaskDialogOpen] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [nextTaskId, setNextTaskId] = useState<string | undefined>(undefined);
  const [taskDetails, setTaskDetails] = useState<SearchResultItem | null>(null);

  const { toast } = useToast();
  const { refreshJobOwner } = useTaskContext();

  // Helper function to safely get ID from item (handles both id and _id)
  const getId = (item: SearchResultItem | null): string | undefined => {
    if (!item) return undefined;
    return item.id || item._id; // Try both id and _id
  };

  // Helper function to get item type, safely handling undefined
  const getItemType = (item: SearchResultItem | null): string => {
    if (!item || !item.type) return 'Unknown';
    return item.type;
  };

  // Helper to check if item is a job
  const isItemJob = (item: SearchResultItem | null): boolean => {
    if (!item || !item.type) return false;
    return item.type.toLowerCase() === 'job';
  };

  // Format the type for display
  const formatType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Fetch business functions
  useEffect(() => {
    const fetchBusinessFunctions = async () => {
      try {
        const response = await fetch("/api/business-functions");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch business functions: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          const functions = result.data.map((bf: any) => ({
            id: bf._id,
            name: bf.name,
          }));
          
          setBusinessFunctions(functions);
          
          // Create a mapping from ID to name
          const mapping: Record<string, string> = {};
          functions.forEach((bf: { id: string; name: string }) => {
            mapping[bf.id] = bf.name;
          });
          
          setBusinessFunctionMap(mapping);
        }
      } catch (error) {
        console.error("Error fetching business functions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch business functions",
          variant: "destructive",
        });
      }
    };

    fetchBusinessFunctions();
  }, [toast]);

  // Fetch owners from API
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const response = await fetch("/api/owners");

        if (!response.ok) {
          throw new Error(`Failed to fetch owners: ${response.status}`);
        }

        const ownersData = await response.json();
        
        // Create a mapping from owner ID to owner name
        const mapping: Record<string, string> = {};
        if (Array.isArray(ownersData)) {
          const ownersList = ownersData;
          setOwners(ownersList);
          
          ownersList.forEach((owner: { _id: string; name: string }) => {
            if (owner._id && owner.name) {
              mapping[owner._id] = owner.name;
            }
          });
        } else if (ownersData.data && Array.isArray(ownersData.data)) {
          const ownersList = ownersData.data;
          setOwners(ownersList);
          
          ownersList.forEach((owner: { _id: string; name: string }) => {
            if (owner._id && owner.name) {
              mapping[owner._id] = owner.name;
            }
          });
        }
        
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

  // Fetch task details if it's a task
  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!selectedItem || isItemJob(selectedItem)) {
        setTaskDetails(null);
        return;
      }
      
      // It's a task, fetch details if we're missing any
      if (
        selectedItem.focusLevel &&
        selectedItem.joyLevel &&
        selectedItem.date &&
        selectedItem.requiredHours
      ) {
        // We already have all details
        setTaskDetails(selectedItem);
        return;
      }

      const taskId = getId(selectedItem);
      if (!taskId) return;

      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const result = await response.json();
        
        if (result.success) {
          setTaskDetails({
            ...selectedItem,
            ...result.data,
            id: taskId,
          });
        }
      } catch (error) {
        console.error("Error fetching task details:", error);
      }
    };

    fetchTaskDetails();
  }, [selectedItem]);

  // Fetch tasks when job changes
  useEffect(() => {
    if (selectedItem) {
      // Log for debugging
      console.log("Selected item:", selectedItem);
      console.log("Item ID:", getId(selectedItem));
      
      if (isItemJob(selectedItem)) {
        fetchTasks();
        // Set the next task ID from the job
        setNextTaskId(selectedItem.nextTaskId);
      }
    } else {
      setTasks([]);
      setNextTaskId(undefined);
    }
  }, [selectedItem]);

  const fetchTasks = async () => {
    if (!selectedItem) return;
    
    // Get ID safely (handles both id and _id)
    const itemId = getId(selectedItem);
    
    if (!itemId) {
      console.error("Cannot fetch tasks: item ID is undefined", selectedItem);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Fetching tasks with jobId:", itemId);
      const response = await fetch(`/api/tasks?jobId=${itemId}`);
      const result = await response.json();
      console.log("Tasks API response:", result);

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
          isNextTask: task._id === selectedItem.nextTaskId,
        }));

        setTasks(formattedTasks);
        console.log("Formatted tasks:", formattedTasks);
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

        // Trigger a refresh of the job progress since we deleted a task
        const itemId = getId(selectedItem);
        if (itemId) {
          const event = new CustomEvent('job-progress-update', { 
            detail: { jobId: itemId } 
          });
          window.dispatchEvent(event);
        }
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

  const handleCompleteTask = async (id: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
      });
      const result = await response.json();
      if (result.success) {
        // If the completed task was the next task, we need to update the job
        if (completed && id === nextTaskId) {
          // Clear the next task since it's now completed
          await updateJobNextTask("none");
        }

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

        // If the task completion status changed, trigger a progress update
        const itemId = getId(selectedItem);
        if (itemId) {
          const event = new CustomEvent('job-progress-update', { 
            detail: { jobId: itemId } 
          });
          window.dispatchEvent(event);
        }
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

  const updateJobNextTask = async (taskId: string) => {
    if (!selectedItem) return;
    
    const itemId = getId(selectedItem);
    if (!itemId) {
      console.error("Cannot update next task: item ID is undefined");
      return;
    }

    try {
      const taskIdToSave = taskId === "none" ? null : taskId;

      const response = await fetch(`/api/jobs/${itemId}`, {
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
      const itemId = getId(selectedItem);
      if (!itemId) {
        console.error("Cannot submit task: item ID is undefined");
        return;
      }
      
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
          await updateJobTasks([...tasks.map((t) => t.id), newTask.id]);

          // Trigger a refresh of the job progress since we added a new task
          const event = new CustomEvent('job-progress-update', { 
            detail: { jobId: itemId } 
          });
          window.dispatchEvent(event);

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
            isNextTask: currentTask.isNextTask,
          };

          // If the task completion status changed, trigger a progress update
          if (currentTask.completed !== updatedTask.completed) {
            const event = new CustomEvent('job-progress-update', { 
              detail: { jobId: itemId } 
            });
            window.dispatchEvent(event);
          }

          // If the owner changed, trigger an owner update
          if (currentTask.owner !== updatedTask.owner && 
              updatedTask.isNextTask) {
            const event = new CustomEvent('job-owner-update', { 
              detail: { jobId: itemId } 
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

  const updateJobTasks = async (taskIds: string[]) => {
    if (!selectedItem) return;
    
    const itemId = getId(selectedItem);
    if (!itemId) {
      console.error("Cannot update job tasks: item ID is undefined");
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${itemId}`, {
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

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Gets owner name from owner ID
  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return "Not assigned";
    return ownerMap[ownerId] || "Not assigned";
  };

  // Gets business function name from ID
  const getBusinessFunctionName = (businessFunctionId?: string) => {
    if (!businessFunctionId) return "None";
    return businessFunctionMap[businessFunctionId] || businessFunctionId;
  };

  if (!selectedItem) {
    return null;
  }

  // Check if item is a job using the helper function
  const isJob = isItemJob(selectedItem);
  const itemType = getItemType(selectedItem);
  const displayType = formatType(itemType);
  
  // For task view, use the detailed task data if available
  const itemToDisplay = !isJob && taskDetails ? taskDetails : selectedItem;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl overflow-y-auto"
          side="right"
        >
          <TaskProvider>
            <SheetHeader className="mb-4">
              <SheetTitle>
                {isJob ? 'Job Details' : 'Task Details'}
              </SheetTitle>
              <SheetDescription>
                {isJob ? 'View job and related tasks' : 'View task details'}
              </SheetDescription>
            </SheetHeader>

            {/* Details Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{itemToDisplay.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {itemToDisplay.notes && (
                  <div>
                    <p className="text-sm font-medium">Notes:</p>
                    <div className="text-sm text-muted-foreground" style={{ whiteSpace: 'pre-wrap', overflowY: 'auto', overflowX: 'hidden', maxHeight: '10rem', wordBreak: 'break-word' }}>
                      {itemToDisplay.notes}
                    </div>
                  </div>
                )}

                {/* Business Function - always show for jobs */}
                {isJob && (
                  <div>
                    <p className="text-sm font-medium">Business Function:</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.businessFunctionName || getBusinessFunctionName(selectedItem.businessFunctionId)}
                    </p>
                  </div>
                )}
                
                {/* Owner - always show for tasks */}
                {!isJob && (
                  <div>
                    <p className="text-sm font-medium">Owner:</p>
                    <p className="text-sm text-muted-foreground">
                      {getOwnerName(itemToDisplay.owner)}
                    </p>
                  </div>
                )}
                
                {/* Due/Do Date */}
                {isJob ? (
                  // Due Date for Jobs
                  itemToDisplay.dueDate && (
                    <div>
                      <p className="text-sm font-medium">Due Date:</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(itemToDisplay.dueDate)}
                      </p>
                    </div>
                  )
                ) : (
                  // Do Date for Tasks
                  <div>
                    <p className="text-sm font-medium">Do Date:</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(itemToDisplay.date)}
                    </p>
                  </div>
                )}
                
                {/* Task specific attributes */}
                {!isJob && (
                  <>
                    {/* Focus Level */}
                    <div>
                      <p className="text-sm font-medium">Focus Level:</p>
                      <p className="text-sm text-muted-foreground">
                        {itemToDisplay.focusLevel || "Not set"}
                      </p>
                    </div>
                    
                    {/* Joy Level */}
                    <div>
                      <p className="text-sm font-medium">Joy Level:</p>
                      <p className="text-sm text-muted-foreground">
                        {itemToDisplay.joyLevel || "Not set"}
                      </p>
                    </div>
                    
                    {/* Required Hours */}
                    <div>
                      <p className="text-sm font-medium">Hours Required:</p>
                      <p className="text-sm text-muted-foreground">
                        {itemToDisplay.requiredHours ? `${itemToDisplay.requiredHours}h` : "Not set"}
                      </p>
                    </div>
                  </>
                )}
                
                <div>
                  <p className="text-sm font-medium">Type:</p>
                  <p className="text-sm text-muted-foreground">
                    {displayType}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Add Task Button - only for jobs */}
            {isJob && (
              <div className="mb-4">
                <Button onClick={handleAddTask} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Task
                </Button>
              </div>
            )}

            {/* Tasks List - only for jobs */}
            {isJob && (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Tasks</h3>
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <p>Loading tasks...</p>
                  </div>
                ) : (
                  <TaskCards
                    data={tasks}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onComplete={handleCompleteTask}
                    ownerMap={ownerMap}
                  />
                )}
              </>
            )}
          </TaskProvider>
        </SheetContent>
      </Sheet>

      {/* Task Dialog for creating/editing tasks - only for jobs */}
      {isJob && taskDialogOpen && (
        <TaskDialog
          mode={dialogMode}
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          onSubmit={handleTaskSubmit}
          initialData={currentTask}
          jobId={getId(selectedItem) || ""}
        />
      )}
    </>
  );
}