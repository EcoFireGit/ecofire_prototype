"use client";

import { useState, useEffect } from "react";
import { NextTasks } from "@/components/tasks/feed/tasks";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog-jobselector";
import FilterComponent from "@/components/filters/filter-component";
import TaskSortingComponent from "@/components/sorting/task-sorting-component";
import { Plus, PawPrint, Calendar, Briefcase, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPrioriCalendarId } from "@/lib/services/gcal.service";
// Type imports only
//import type { Task } from "@/lib/models/task.model";
import { Job } from "@/components/jobs/table/columns";
import { Task } from "../types";

import type { Jobs } from "@/lib/models/job.model";

export default function TaskFeedView() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [sortedTasks, setSortedTasks] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [businessFunctionMap, setBusinessFunctionMap] = useState<
    Record<string, string>
  >({});
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [owners, setOwners] = useState<{ _id: string; name: string }[]>([]);
  const [businessFunctions, setBusinessFunctions] = useState<
    { id: string; name: string }[]
  >([]);
  const { toast } = useToast();
  const [tags, setTags] = useState<{ _id: string; name: string }[]>([]);

  // State for task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);

  // State for confirmation dialogs
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<{
    id: string;
    jobId: string;
    title: string;
  } | null>(null);

  // State for notes dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [taskNotes, setTaskNotes] = useState<{
    title: string;
    notes: string;
  } | null>(null);

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
        if (
          job.businessFunctionId &&
          !businessFunctionIds.includes(job.businessFunctionId)
        ) {
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
        // next tasks function fetches next tasks, followed by all tasks.
        console.log("Falling back to next-steps endpoint");
        const nextTasksResponse = await fetch("/api/tasks/next-steps");
        const nextTasksResult = await nextTasksResponse.json();

        if (nextTasksResult.success && Array.isArray(nextTasksResult.data)) {
          allTasks = nextTasksResult.data;
        } else {
          throw new Error("Failed to fetch tasks from either endpoint");
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
            console.error(
              `Error fetching tasks for job ${jobId}:`,
              jobTaskError,
            );
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
      // Fetch tags for filtering
      await fetchTags();
      console.log("Fetched tasks:", allTasks);

      // Remove any duplicate tasks and filter out completed tasks
      const uniqueTasks = Array.from(
        new Map(allTasks.map((task: any) => [task._id, task])).values(),
      ).filter((task: any) => task.completed !== true);

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
      const response = await fetch("/api/owners");
      const result = await response.json();

      let ownersData: { _id: string; name: string }[] = [];
      let ownerMap: Record<string, string> = {};

      if (Array.isArray(result)) {
        ownersData = result.map((owner) => ({
          _id: owner._id,
          name: owner.name,
        }));

        result.forEach((owner) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      } else if (result.data && Array.isArray(result.data)) {
        ownersData = result.data.map((owner: any) => ({
          _id: owner._id,
          name: owner.name,
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

  // Add a fetchTags function with the other fetch functions
  const fetchTags = async () => {
    try {
      const response = await fetch("/api/task-tags");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setTags(result.data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
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
    const filtered = tasks.filter((task) => {
      let matches = true;

      // Get the associated job for this task
      const job = task.jobId ? jobs[task.jobId] : null;

      // Process each filter
      Object.entries(filters).forEach(([key, value]) => {
        // Skip empty values or "any" values
        if (
          value === "" ||
          value === null ||
          value === undefined ||
          value === "any"
        )
          return;

        switch (key) {
          // Task filters
          case "focusLevel":
            if (task.focusLevel !== value) matches = false;
            break;
          case "joyLevel":
            if (task.joyLevel !== value) matches = false;
            break;
          case "owner":
            if (task.owner !== value) matches = false;
            break;
          case "minHours":
            if (!task.requiredHours || task.requiredHours < value)
              matches = false;
            break;
          case "maxHours":
            if (!task.requiredHours || task.requiredHours > value)
              matches = false;
            break;
          case "dueDate":
            if (!task.date || new Date(task.date) > new Date(value))
              matches = false;
            break;

          // Job filters
          case "businessFunctionId":
            if (!job || job.businessFunctionId !== value) matches = false;
            break;
          case "tags":
            if (!Array.isArray(value) || value.length === 0) break;

            if (!task.tags || !Array.isArray(task.tags)) {
              matches = false;
              break;
            }

            // Convert selected tag IDs to tag names for comparison
            const selectedTagNames = value
              .map((tagId) => {
                const tag = tags.find((t) => t._id === tagId);
                return tag ? tag.name : null;
              })
              .filter(Boolean); // Remove any null values

            // Compare using tag names instead of IDs
            if (
              !selectedTagNames.every((tagName) => task.tags.includes(tagName))
            ) {
              matches = false;
            }
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
  const completeTask = async (jobid: string, id: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobid}/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: true,
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
                  completed: true,
                }
              : task,
          ),
        );

        // Also update filtered tasks
        setFilteredTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: true,
                }
              : task,
          ),
        );

        //No need to update job because task udpate will handle it in the backend

        // If this task is a next task for a job, update the job
        // const jobsWithThisNextTask = Object.values(jobs).filter(
        //   (job: any) => job.nextTaskId === id
        // );

        // // Update each job found
        // for (const job of jobsWithThisNextTask) {
        //   await fetch(`/api/jobs/${job._id}`, {
        //     method: "PUT",
        //     headers: {
        //       "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({
        //       nextTaskId: null,
        //     }),
        //   });
        // }

        // Filter out the task after a brief delay
        setTimeout(() => {
          setTasks((prevTasks) => prevTasks.filter((task) => task._id !== id));
          setFilteredTasks((prevTasks) =>
            prevTasks.filter((task) => task._id !== id),
          );
          setSortedTasks((prevTasks) =>
            prevTasks.filter((task) => task._id !== id),
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
      const task = tasks.find((t) => t._id === id);
      if (task) {
        setTaskToComplete({ id, jobId: task.jobId, title: task.title });
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
          completed: false,
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
                  completed: false,
                }
              : task,
          ),
        );

        // Also update filtered tasks
        setFilteredTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: false,
                }
              : task,
          ),
        );

        // Also update sorted tasks
        setSortedTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === id
              ? {
                  ...task,
                  completed: false,
                }
              : task,
          ),
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
        notes: task.notes || "No notes available for this task.",
      });
      setNotesDialogOpen(true);
    }
  };

  // Add task to calendar
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

  const handleAddTask = () => {
    setDialogMode("create");
    setCurrentTask(undefined);
    setEditingTask(null); // Clear editing task when creating a new task
    setTaskDialogOpen(true);
  };

  // Edit task
  const handleEditTask = (task: any) => {
    setDialogMode("edit");
    // Make sure we have a consistent task object with both id and _id properties
    const fullTask = {
      ...task,
      id: task.id || task._id,
      _id: task._id || task.id,
    };
    setCurrentTask(fullTask);
    setEditingTask(fullTask);
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
          };

          // Add task ID to job's tasks array if jobId exists
          if (newTask.jobId && jobs[newTask.jobId]) {
            try {
              // Get current tasks array for the job
              const currentJob = jobs[newTask.jobId];
              const currentTasks = currentJob.tasks || [];
              const updatedTasks = [...currentTasks, newTask.id];

              // Update the job with the new tasks array
              const jobUpdateResponse = await fetch(`/api/jobs/${newTask.jobId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ tasks: updatedTasks }),
              });

              if (!jobUpdateResponse.ok) {
                console.error("Failed to update job tasks array");
              } else {
                // Update local jobs state
                setJobs(prevJobs => ({
                  ...prevJobs,
                  [newTask.jobId]: {
                    ...prevJobs[newTask.jobId],
                    tasks: updatedTasks
                  }
                }));

                // Trigger a job progress update event
                const event = new CustomEvent("job-progress-update", {
                  detail: { jobId: newTask.jobId },
                });
                window.dispatchEvent(event);
              }
            } catch (jobUpdateError) {
              console.error("Error updating job tasks:", jobUpdateError);
            }
          }

          // Add task to the state
          setTasks((prevTasks) => [...prevTasks, newTask]);

          // Re-sort and update filtered tasks
          const updatedTasks = [...tasks, newTask];
          const sortedUpdatedTasks = sortTasks(updatedTasks, jobs);
          setTasks(sortedUpdatedTasks);
          handleFilterChange(activeFilters);

          toast({
            title: "Success",
            description: "Task created successfully",
          });
        } else {
          throw new Error(result.error || "Failed to create task");
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
            isNextTask: false,
          };

          // If the task completion status changed, trigger a progress update
          if (currentTask.completed !== updatedTask.completed) {
            const event = new CustomEvent("job-progress-update", {
              detail: { jobId: result.data.jobId },
            });
            window.dispatchEvent(event);
          }

          // Update task in all state arrays - ensure we properly update with the full task data
          const updateTaskState = (tasksArray: any[]) =>
            tasksArray.map((task) => {
              if (task.id === updatedTask.id) {
                // Create a complete merged object to ensure all properties are updated
                return {
                  ...task,
                  ...updatedTask,
                };
              }
              return task;
            });

          // Apply updates to all task arrays
          setTasks(updateTaskState(tasks));
          setFilteredTasks(updateTaskState(filteredTasks));
          setSortedTasks(updateTaskState(sortedTasks));

          toast({
            title: "Success",
            description: "Task updated successfully",
          });
        } else {
          throw new Error(result.error || "Failed to update task");
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
        setFilteredTasks((prevTasks) =>
          prevTasks.filter((task) => task._id !== id),
        );
        setSortedTasks((prevTasks) =>
          prevTasks.filter((task) => task._id !== id),
        );

        // Find any jobs that reference this task as nextTaskId and update them
        const jobsWithThisNextTask = Object.values(jobs).filter(
          (job: any) => job.nextTaskId === id,
        );

        for (const job of jobsWithThisNextTask) {
          await fetch(`/api/jobs/${job._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nextTaskId: null,
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
    <div className="p-4 w-full">
      <div className="flex gap-2">
        <div className="w-full max-w-none">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Tasks</h1>

            {/* Add the FilterComponent and TaskSortingComponent at the top */}

            <div className="mb-4">
              <Button onClick={handleAddTask}>
                <Plus className="mr-2 h-4 w-4" /> Create Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <FilterComponent
          onFilterChange={handleFilterChange}
          businessFunctions={businessFunctions}
          owners={owners}
          tags={tags}
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

      {/* Task Dialog - Always render with proper mode and data */}
      <TaskDialog
        mode={dialogMode}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSubmit={handleTaskSubmit}
        initialData={editingTask}
        jobs={jobs} // Pass the jobs object to TaskDialog
      />

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
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (taskToComplete) {
                  completeTask(taskToComplete.jobId, taskToComplete.id);
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
            <Button onClick={() => setNotesDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
