"use client";

import { useState, useEffect } from "react";
import { NextTasks } from "@/components/tasks/feed/tasks";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog";
import FilterComponent from "@/components/filters/filter-component";
import TaskSortingComponent from "@/components/sorting/task-sorting-component";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Type imports only
import type { Task } from "@/lib/models/task.model";
import type { Jobs } from "@/lib/models/job.model";

export default function TaskFeedView() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [sortedTasks, setSortedTasks] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [businessFunctionMap, setBusinessFunctionMap] = useState<Record<string, string>>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [owners, setOwners] = useState<{ _id: string; name: string }[]>([]);
  const [businessFunctions, setBusinessFunctions] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();
  
  // State for task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  
  // State for confirmation dialogs
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<{id: string, title: string} | null>(null);
  
  // State for notes dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [taskNotes, setTaskNotes] = useState<{title: string, notes: string} | null>(null);

  // Function to fetch all tasks and jobs
  const fetchData = async () => {
    setLoading(true);
    try {
      // First get all jobs
      const jobsResponse = await fetch("/api/jobs");
      const jobsResult = await jobsResponse.json();
      
      if (!jobsResult.success || !Array.isArray(jobsResult.data)) {
        throw new Error("Failed to fetch jobs");
      }
      
      // Create a job map for lookup
      const jobsMap: Record<string, any> = {};
      
      // Collect all business function ids to fetch their names
      const businessFunctionIds: string[] = [];
      
      jobsResult.data.forEach((job: any) => {
        // Store the job in our map
        if (job._id) {
          jobsMap[job._id] = job;
        }
        
        // Collect business function ids
        if (job.businessFunctionId && !businessFunctionIds.includes(job.businessFunctionId)) {
          businessFunctionIds.push(job.businessFunctionId);
        }
      });
      
      // Update jobs state
      setJobs(jobsMap);
      
      // Fetch business function names
      if (businessFunctionIds.length > 0) {
        try {
          const bfResponse = await fetch("/api/business-functions");
          const bfResult = await bfResponse.json();
          
          if (bfResult.success && Array.isArray(bfResult.data)) {
            const bfMap: Record<string, string> = {};
            const bfArray: { id: string; name: string }[] = [];
            
            bfResult.data.forEach((bf: any) => {
              if (bf._id && bf.name) {
                bfMap[bf._id] = bf.name;
                bfArray.push({ id: bf._id, name: bf.name });
              }
            });
            
            setBusinessFunctionMap(bfMap);
            setBusinessFunctions(bfArray);
          }
        } catch (bfError) {
          console.error("Error fetching business functions:", bfError);
        }
      }
      
      // Try to fetch tasks using the next-steps endpoint first (which we know works)
      let allTasks = [];
      try {
        // First try to get all tasks
        const allTasksResponse = await fetch("/api/tasks");
        const allTasksResult = await allTasksResponse.json();
        
        if (allTasksResult.success && Array.isArray(allTasksResult.data)) {
          allTasks = allTasksResult.data;
        } else {
          // Fallback to fetching next tasks only
          console.log("Falling back to next-steps endpoint");
          const nextTasksResponse = await fetch("/api/tasks/next-steps");
          const nextTasksResult = await nextTasksResponse.json();
          
          if (nextTasksResult.success && Array.isArray(nextTasksResult.data)) {
            allTasks = nextTasksResult.data;
          } else {
            throw new Error("Failed to fetch tasks from either endpoint");
          }
        }
      } catch (taskError) {
        console.error("Error fetching tasks:", taskError);
        // Try another approach - fetch tasks by job IDs
        
        // Get all job IDs
        const jobIds = Object.keys(jobsMap);
        let jobTasks: any[] = [];
        
        // Fetch tasks for each job
        for (const jobId of jobIds) {
          try {
            const jobTasksResponse = await fetch(`/api/tasks/job/${jobId}`);
            const jobTasksResult = await jobTasksResponse.json();
            
            if (jobTasksResult.success && Array.isArray(jobTasksResult.data)) {
              jobTasks = [...jobTasks, ...jobTasksResult.data];
            }
          } catch (jobTaskError) {
            console.error(`Error fetching tasks for job ${jobId}:`, jobTaskError);
          }
        }
        
        if (jobTasks.length > 0) {
          allTasks = jobTasks;
        } else {
          // Final fallback - construct a list from job.nextTaskId values
          const nextTaskIds = Object.values(jobsMap)
            .filter((job: any) => job.nextTaskId)
            .map((job: any) => job.nextTaskId);
            
          for (const taskId of nextTaskIds) {
            try {
              const taskResponse = await fetch(`/api/tasks/${taskId}`);
              const taskResult = await taskResponse.json();
              
              if (taskResult.success && taskResult.data) {
                allTasks.push(taskResult.data);
              }
            } catch (taskError) {
              console.error(`Error fetching task ${taskId}:`, taskError);
            }
          }
        }
      }
      
      // Fetch owners for mapping and filters
      await fetchOwners();
      
      console.log("Fetched tasks:", allTasks);
      
      // Remove any duplicate tasks and filter out completed tasks
      const uniqueTasks = Array.from(new Map(
        allTasks.map((task: any) => [task._id, task])
      ).values()).filter((task: any) => task.completed !== true);
      
      const sortedTasks = sortTasks(uniqueTasks, jobsMap);
      
      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
      setSortedTasks(sortedTasks);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to sort tasks - next tasks first, ordered by job impact score
  const sortTasks = (tasks: any[], jobsMap: Record<string, any>) => {
    return [...tasks].sort((a, b) => {
      // Check if task is a next task
      const aIsNextTask = a.jobId && jobsMap[a.jobId]?.nextTaskId === a._id;
      const bIsNextTask = b.jobId && jobsMap[b.jobId]?.nextTaskId === b._id;
      
      // First sort by next task status
      if (aIsNextTask && !bIsNextTask) return -1;
      if (!aIsNextTask && bIsNextTask) return 1;
      
      // If both are next tasks, sort by job impact score (higher first)
      if (aIsNextTask && bIsNextTask) {
        const aImpact = jobsMap[a.jobId]?.impact || 0;
        const bImpact = jobsMap[b.jobId]?.impact || 0;
        return bImpact - aImpact;
      }
      
      // If neither are next tasks, sort by date
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      
      // Default fallback for sorting
      return 0;
    });
  };

  // Function to fetch owners for filters
  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners');
      const result = await response.json();
      
      let ownersData: { _id: string; name: string }[] = [];
      let ownerMap: Record<string, string> = {};
      
      if (Array.isArray(result)) {
        ownersData = result.map(owner => ({
          _id: owner._id,
          name: owner.name
        }));
        
        result.forEach((owner) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      } else if (result.data && Array.isArray(result.data)) {
        ownersData = result.data.map((owner: any) => ({
          _id: owner._id,
          name: owner.name
        }));
        
        result.data.forEach((owner: any) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      }
      
      setOwners(ownersData);
      setOwnerMap(ownerMap);
      
      return ownersData;
    } catch (error) {
      console.error("Error fetching owners:", error);
      return [];
    }
  };

  // Handler for filter changes
  const handleFilterChange = (filters: Record<string, any>) => {
    setActiveFilters(filters);
    
    if (Object.keys(filters).length === 0) {
      // If no filters are active, show all tasks
      setFilteredTasks(tasks);
      return;
    }
    
    // Filter tasks based on the provided filters
    const filtered = tasks.filter(task => {
      let matches = true;
      
      // Get the associated job for this task
      const job = task.jobId ? jobs[task.jobId] : null;
      
      // Process each filter
      Object.entries(filters).forEach(([key, value]) => {
        // Skip empty values or "any" values
        if (value === "" || value === null || value === undefined || value === "any") return;
        
        switch (key) {
          // Task filters
          case 'focusLevel':
            if (task.focusLevel !== value) matches = false;
            break;
          case 'joyLevel':
            if (task.joyLevel !== value) matches = false;
            break;
          case 'owner':
            if (task.owner !== value) matches = false;
            break;
          case 'minHours':
            if (!task.requiredHours || task.requiredHours < value) matches = false;
            break;
          case 'maxHours':
            if (!task.requiredHours || task.requiredHours > value) matches = false;
            break;
          case 'dueDate':
            if (!task.date || new Date(task.date) > new Date(value)) matches = false;
            break;
            
          // Job filters
          case 'businessFunctionId':
            if (!job || job.businessFunctionId !== value) matches = false;
            break;
        }
      });
      
      return matches;
    });
    
    setFilteredTasks(filtered);
  };

  // Handler for sort changes
  const handleSortChange = (sortedTasks: any[]) => {
    setSortedTasks(sortedTasks);
  };

  // Effect to update filtered tasks when tasks change
  useEffect(() => {
    // Apply filters to the new tasks
    handleFilterChange(activeFilters);
  }, [tasks]);

  // Fetch all necessary data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  // Function to complete a task
  const completeTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: true
                }
              : task
          )
        );
        
        // Also update filtered tasks
        setFilteredTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: true
                }
              : task
          )
        );

        // If this task is a next task for a job, update the job
        const jobsWithThisNextTask = Object.values(jobs).filter(
          (job: any) => job.nextTaskId === id
        );
        
        // Update each job found
        for (const job of jobsWithThisNextTask) {
          await fetch(`/api/jobs/${job._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nextTaskId: null
            }),
          });
        }

        // Filter out the task after a brief delay
        setTimeout(() => {
          setTasks((prevTasks) =>
            prevTasks.filter((task) => task._id !== id)
          );
          setFilteredTasks((prevTasks) =>
            prevTasks.filter((task) => task._id !== id)
          );
          setSortedTasks((prevTasks) =>
            prevTasks.filter((task) => task._id !== id)
          );
        }, 500);

        toast({
          title: "Task completed",
          description: "Great job!",
        });
      } else {
        throw new Error(result.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      });
    }
  };
  
  // Handle checkbox change
  const handleCompleteTask = (id: string, completed: boolean) => {
    if (completed) {
      // Find the task title for the confirmation dialog
      const task = tasks.find(t => t._id === id);
      if (task) {
        setTaskToComplete({ id, title: task.title });
        setCompleteDialogOpen(true);
      }
    } else {
      // Reopening a task doesn't need confirmation
      reopenTask(id);
    }
  };
  
  // Reopen a task
  const reopenTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: false
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: false
                }
              : task
          )
        );
        
        // Also update filtered tasks
        setFilteredTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: false
                }
              : task
          )
        );
        
        // Also update sorted tasks
        setSortedTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: false
                }
              : task
          )
        );

        toast({
          title: "Task reopened",
          description: "Task has been reopened",
        });
      } else {
        throw new Error(result.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error reopening task:", error);
      toast({
        title: "Error",
        description: "Failed to reopen task",
        variant: "destructive",
      });
    }
  };

  // Handle viewing task notes
  const handleViewNotes = (task: any) => {
    if (task && task.title) {
      setTaskNotes({
        title: task.title,
        notes: task.notes || "No notes available for this task."
      });
      setNotesDialogOpen(true);
    }
  };

  // Add task to calendar
  const handleAddToCalendar = (task: any) => {
    toast({
      title: "Added to calendar",
      description: `"${task.title}" has been added to your calendar`,
    });
  };

  // Edit task
  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };
  
  // Handle task update
  const handleTaskUpdate = async (taskData: any) => {
    try {
      if (!editingTask) return;
      
      const response = await fetch(`/api/tasks/${editingTask._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();

      if (result.success) {
        // Update both tasks and filteredTasks in the local state
        const updatedTask = { ...editingTask, ...taskData };
        
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === editingTask._id ? updatedTask : task
          )
        );
        
        // Re-sort tasks after update
        const updatedTasks = [...tasks.map(task => 
          task._id === editingTask._id ? updatedTask : task
        )];
        
        const sortedUpdatedTasks = sortTasks(updatedTasks, jobs);
        setTasks(sortedUpdatedTasks);
        
        // Apply filters again to ensure the updated task still matches the current filters
        handleFilterChange(activeFilters);
        
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
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
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // Remove task from both UI states
        setTasks((prevTasks) => prevTasks.filter((task) => task._id !== id));
        setFilteredTasks((prevTasks) => prevTasks.filter((task) => task._id !== id));
        setSortedTasks((prevTasks) => prevTasks.filter((task) => task._id !== id));

        // Find any jobs that reference this task as nextTaskId and update them
        const jobsWithThisNextTask = Object.values(jobs).filter(
          (job: any) => job.nextTaskId === id
        );
        
        for (const job of jobsWithThisNextTask) {
          await fetch(`/api/jobs/${job._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nextTaskId: null
            }),
          });
        }

        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
      } else {
        throw new Error(result.error || "Failed to delete task");
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

  // Function to check if task is a next task
  const isNextTask = (task: any) => {
    if (!task.jobId || !jobs[task.jobId]) return false;
    return jobs[task.jobId].nextTaskId === task._id;
  };

  return (
    <div className="container mx-auto p-4">
      {/* Add the FilterComponent and TaskSortingComponent at the top */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <FilterComponent
          onFilterChange={handleFilterChange}
          businessFunctions={businessFunctions}
          owners={owners}
          initialFilters={activeFilters}
        />
        
        <TaskSortingComponent
          onSortChange={handleSortChange}
          tasks={filteredTasks}
          jobs={jobs}
        />
      </div>
      
      <div className="grid gap-6 mt-4">
        <div className="w-full">
          <NextTasks
            tasks={sortedTasks}
            jobs={jobs}
            onComplete={handleCompleteTask}
            onViewTask={handleViewNotes}
            onAddToCalendar={handleAddToCalendar}
            ownerMap={ownerMap}
            loading={loading}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            businessFunctionMap={businessFunctionMap}
            isNextTask={isNextTask}
          />
        </div>
      </div>

      {/* Task Edit Dialog */}
      {editingTask && (
        <TaskDialog
          mode="edit"
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          onSubmit={handleTaskUpdate}
          initialData={editingTask}
          jobId={editingTask.jobId}
        />
      )}
      
      {/* Task Completion Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this task as complete?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{taskToComplete?.title}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (taskToComplete) {
                  completeTask(taskToComplete.id);
                  setCompleteDialogOpen(false);
                }
              }}
            >
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Task Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{taskNotes?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <h3 className="text-sm font-medium mb-2">Notes:</h3>
            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto">
              {taskNotes?.notes}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNotesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}