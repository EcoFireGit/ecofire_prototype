"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { NextTasks } from "@/components/tasks/feed/tasks";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog-jobselector";
import { TaskDetailsSidebar } from "@/components/tasks/task-details-sidebar";
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
import { TasksSidebar } from "@/components/tasks/tasks-sidebar";
import MyDayView from "./my-day-view";
import Split from 'react-split';

// Helper to map API Job to Job type
function mapJobToSidebarJob(job: any): Job {
  return {
    id: job._id,
    jobNumber: job.jobNumber ?? 0,
    title: job.title,
    notes: job.notes,
    businessFunctionId: job.businessFunctionId,
    businessFunctionName: job.businessFunctionName,
    dueDate: job.dueDate ? (typeof job.dueDate === 'string' ? job.dueDate : new Date(job.dueDate).toISOString()) : undefined,
    createdDate: job.createdDate ? (typeof job.createdDate === 'string' ? job.createdDate : new Date(job.createdDate).toISOString()) : new Date().toISOString(),
    isDone: job.isDone,
    nextTaskId: job.nextTaskId ?? undefined,
    tasks: job.tasks ?? undefined,
    impact: job.impact ?? undefined,
  };
}

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

  const [taskDetailsSidebarOpen, setTaskDetailsSidebarOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [tasksSidebarOpen, setTasksSidebarOpen] = useState(false);
  const [selectedJobForSidebar, setSelectedJobForSidebar] = useState<Job | null>(null);

  // Add state for minimized panes
  const [mainMinimized, setMainMinimized] = useState(false);
  const [myDayMinimized, setMyDayMinimized] = useState(false);
  const [splitSizes, setSplitSizes] = useState([50, 50]);
  const [showTabs, setShowTabs] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const showTasksTabRef = useRef<HTMLButtonElement>(null);
  const showMyDayTabRef = useRef<HTMLButtonElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);



  // Handler for Split drag
  const handleSplitDrag = useCallback((sizes: number[]) => {
    setSplitSizes(sizes);
  }, []);

  // Handler for Split drag end
  const handleSplitDragEnd = useCallback((sizes: number[]) => {
    // Only allow resizing on desktop
    if (isMobile) return;
    
    // If left pane is less than 40%, minimize it
    if (sizes[0] < 40) {
      setMainMinimized(true);
      setMyDayMinimized(false);
      setSplitSizes([0, 100]);
      setShowTabs(false);
      // Show tabs after animation completes
      setTimeout(() => setShowTabs(true), 300);
    } else if (sizes[1] < 40) {
      setMainMinimized(false);
      setMyDayMinimized(true);
      setSplitSizes([100, 0]);
      setShowTabs(false);
      // Show tabs after animation completes
      setTimeout(() => setShowTabs(true), 300);
    } else {
      setMainMinimized(false);
      setMyDayMinimized(false);
      setSplitSizes(sizes);
      setShowTabs(false);
    }
  }, [isMobile]);

  // Restore handlers
  const restoreMain = () => {
    if (isMobile) {
      setMainMinimized(false);
      setMyDayMinimized(true);
      setSplitSizes([100, 0]);
    } else {
      setMainMinimized(false);
      setMyDayMinimized(false);
      setSplitSizes([50, 50]);
      setShowTabs(false);
    }
  };
  const restoreMyDay = () => {
    if (isMobile) {
      setMainMinimized(true);
      setMyDayMinimized(false);
      setSplitSizes([0, 100]);
    } else {
      setMainMinimized(false);
      setMyDayMinimized(false);
      setSplitSizes([50, 50]);
      setShowTabs(false);
    }
  };

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
      );

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

  // Check for mobile/tablet screens
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set initial state based on screen size
  useEffect(() => {
    if (isMobile) {
      setMainMinimized(false);
      setMyDayMinimized(true);
      setSplitSizes([100, 0]);
      setShowTabs(true);
    } else {
      setMainMinimized(false);
      setMyDayMinimized(false);
      setSplitSizes([50, 50]);
      setShowTabs(false);
    }
  }, [isMobile]);

  // Fetch all necessary data when component mounts
  useEffect(() => {
    fetchData();

    // Listen for job/task update events and trigger refresh
    const handleJobProgressUpdate = (event: CustomEvent) => {
      fetchData();
    };
    const handleForceJobsRefresh = (event: CustomEvent) => {
      fetchData();
    };
    window.addEventListener('job-progress-update', handleJobProgressUpdate as EventListener);
    window.addEventListener('force-jobs-refresh', handleForceJobsRefresh as EventListener);
    return () => {
      window.removeEventListener('job-progress-update', handleJobProgressUpdate as EventListener);
      window.removeEventListener('force-jobs-refresh', handleForceJobsRefresh as EventListener);
    };
  }, []);

  const handleCompleteTask = (id: string, completed: boolean) => {
    if (completed) {
      const task = tasks.find((t) => t._id === id || t.id === id);
      if (task) {
        setTaskToComplete({ id, jobId: task.jobId, title: task.title });
        setCompleteDialogOpen(true);
      }
    } else {
      handleCompleteTaskConfirmed(id, false);
    }
  };

  const handleCompleteTaskConfirmed = async (id: string, completed: boolean) => {
    let removedTask: any = null;
    setTasks((prevTasks) => {
      if (completed) {
        removedTask = prevTasks.find((task) => task._id === id || task.id === id);
        return prevTasks.filter((task) => task._id !== id && task.id !== id);
      } else {
        return prevTasks.map((task) =>
          (task._id === id || task.id === id)
            ? { ...task, completed }
            : task
        );
      }
    });
    setFilteredTasks((prevTasks) => {
      if (completed) {
        return prevTasks.filter((task) => task._id !== id && task.id !== id);
      } else {
        return prevTasks.map((task) =>
          (task._id === id || task.id === id)
            ? { ...task, completed }
            : task
        );
      }
    });
    setSortedTasks((prevTasks) => {
      if (completed) {
        return prevTasks.filter((task) => task._id !== id && task.id !== id);
      } else {
        return prevTasks.map((task) =>
          (task._id === id || task.id === id)
            ? { ...task, completed }
            : task
        );
      }
    });
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update task");
      }
      toast({
        title: completed ? "Task completed" : "Task reopened",
        description: completed ? "Great job!" : "Task has been reopened",
      });
    } catch (error) {
      setTasks((prevTasks) => {
        if (completed && removedTask) {
          return [removedTask, ...prevTasks];
        } else {
          return prevTasks.map((task) =>
            (task._id === id || task.id === id)
              ? { ...task, completed: !completed }
              : task
          );
        }
      });
      setFilteredTasks((prevTasks) => {
        if (completed && removedTask) {
          return [removedTask, ...prevTasks];
        } else {
          return prevTasks.map((task) =>
            (task._id === id || task.id === id)
              ? { ...task, completed: !completed }
              : task
          );
        }
      });
      setSortedTasks((prevTasks) => {
        if (completed && removedTask) {
          return [removedTask, ...prevTasks];
        } else {
          return prevTasks.map((task) =>
            (task._id === id || task.id === id)
              ? { ...task, completed: !completed }
              : task
          );
        }
      });
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
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

        setTimeout(() => {
          fetchData();
        }, 500);

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

  const handleViewTask = (task: any) => {
    const formattedTask: Task = {
      id: task._id || task.id,
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
      isNextTask: isNextTask(task),
    };
    
    setSelectedTaskForDetails(formattedTask);
    setTaskDetailsSidebarOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    const updateTaskState = (tasksArray: any[]) =>
      tasksArray.map((task) => {
        if (task._id === updatedTask.id || task.id === updatedTask.id) {
          return {
            ...task,
            ...updatedTask,
            _id: task._id || updatedTask.id,
          };
        }
        return task;
      });

    setTasks(updateTaskState(tasks));
    setFilteredTasks(updateTaskState(filteredTasks));
    setSortedTasks(updateTaskState(sortedTasks));
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

  // Handler to add/remove task from My Day
  const handleToggleMyDay = async (task: Task, value: boolean) => {
    const taskId = task.id || (task as any)._id;
    if (!taskId) {
      toast({ title: "Task ID missing", description: "Cannot update My Day for a task without an ID.", variant: "destructive" });
      return;
    }
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    try {
      const res = await fetch(`/api/tasks/${taskId}/myday`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myDay: value, myDayDate: value ? today : null }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setTasks((prev) => prev.map((t) => ((t.id || (t as any)._id) === taskId ? { ...t, myDay: value, myDayDate: value ? today : undefined } : t)));
      } else {
        toast({ title: "Failed to update My Day", description: result.error || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to update My Day", description: (err as Error).message, variant: "destructive" });
    }
  };

  // On My Day page load, auto-reset tasks whose myDayDate !== today
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const expiredMyDayTasks = tasks.filter(t => t.myDay && t.myDayDate !== today);
    if (expiredMyDayTasks.length > 0) {
      // For each expired task, set myDay: false
      Promise.all(expiredMyDayTasks.map(t =>
        fetch(`/api/tasks/${t.id || t._id}/myday`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ myDay: false, myDayDate: null }),
        })
      )).then(() => {
        // Refresh tasks after clearing
        fetchData();
      });
    }
  }, [tasks]);

  // Filter tasks for My Day (include completed, sort incomplete first)
  const myDayTasks = tasks
    .filter((t) => t.myDay)
    .sort((a, b) => Number(a.completed) - Number(b.completed));
  // Filter tasks for main feed (not in My Day, not completed)
  const mainFeedTasks = filteredTasks.filter((t) => !t.myDay && !t.completed);

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
          createdDate: result.data.createdDate,
          endDate: result.data.endDate,
          timeElapsed: result.data.timeElapsed,
        };

        // Add task ID to job's tasks array if jobId exists
        if (result.data.jobId && jobs[result.data.jobId]) {
          try {
            // Get current tasks array for the job
            const currentJob = jobs[result.data.jobId];
            const currentTasks = currentJob.tasks || [];
            const updatedTasks = [...currentTasks, result.data._id];

            // Update the job with the new tasks array
            const jobUpdateResponse = await fetch(`/api/jobs/${result.data.jobId}`, {
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
                [result.data.jobId]: {
                  ...prevJobs[result.data.jobId],
                  tasks: updatedTasks
                }
              }));

              // Trigger a job progress update event
              const event = new CustomEvent("job-progress-update", {
                detail: { jobId: result.data.jobId },
              });
              window.dispatchEvent(event);
            }
          } catch (jobUpdateError) {
            console.error("Error updating job tasks:", jobUpdateError);
          }
        }

        setTimeout(() => {
          fetchData();
        }, 0);

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
          createdDate: result.data.createdDate,
          endDate: result.data.endDate,
          timeElapsed: result.data.timeElapsed,
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
        setTimeout(() => {
          fetchData();
        }, 0);
        
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

  const handleNavigateToJob = (jobId: string) => {
    if (jobs[jobId]) {
      setSelectedJobForSidebar(mapJobToSidebarJob(jobs[jobId]));
      setTaskDetailsSidebarOpen(false);
      setTimeout(() => {
        setTasksSidebarOpen(true);
      }, 200);
    }
  };

  return (
  <>
    <TaskDetailsSidebar
      open={taskDetailsSidebarOpen}
      onOpenChange={setTaskDetailsSidebarOpen}
      selectedTask={selectedTaskForDetails}
      onTaskUpdated={handleTaskUpdated}
      onNavigateToJob={handleNavigateToJob}
      onDeleteTask={handleDeleteTask}
    />
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
    </div>
    <div className="p-4 w-full relative" ref={splitContainerRef}>
      {/* Show Tasks tab */}
      {mainMinimized && showTabs && (
        <button
          ref={showTasksTabRef}
          onClick={restoreMain}
          className="absolute bg-orange-600 text-white px-3 py-2 rounded-l-lg shadow-lg font-semibold text-xs rotate-180 origin-top-left hover:bg-orange-700 transition z-10"
          style={{ 
            writingMode: 'vertical-rl', 
            textOrientation: 'mixed',
            left: '18px',
            top: '95px'
          }}
          aria-label="Show Tasks"
        >
          Show All Tasks
        </button>
      )}
      {/* Show My Day tab */}
      {myDayMinimized && !mainMinimized && showTabs && (
        <button
          ref={showMyDayTabRef}
          onClick={restoreMyDay}
          className="absolute bg-orange-600 text-white px-3 py-2 rounded-l-lg shadow-lg font-semibold text-xs origin-top-right hover:bg-orange-700 transition z-10"
          style={{ 
            writingMode: 'vertical-rl', 
            textOrientation: 'mixed',
            right: '0px',
            top: '0px'
          }}
          aria-label="Show My Day"
        >
          <span>Show My Day</span>
        </button>
      )}
      <div className="w-full overflow-hidden">
        <Split
          className={`w-full flex ${isMobile ? '' : 'gap-8'}`}
          minSize={[mainMinimized ? 0 : 220, myDayMinimized ? 0 : 220]}
          sizes={splitSizes}
          gutterSize={isMobile ? 0 : 8}
          direction="horizontal"
          onDrag={isMobile ? undefined : handleSplitDrag}
          onDragEnd={handleSplitDragEnd}
        >
        <div className={mainMinimized ? "w-0 overflow-hidden transition-all duration-300" : "w-full min-w-0 transition-all duration-300"}>
          {!mainMinimized && (
            <>
              <h2 className="text-2xl font-bold mb-6">All Tasks</h2>
              <NextTasks
                tasks={mainFeedTasks}
                jobs={jobs}
                onComplete={handleCompleteTask}
                onViewTask={handleViewTask}
                onAddToCalendar={handleAddToCalendar}
                ownerMap={ownerMap}
                businessFunctionMap={businessFunctionMap}
                loading={loading}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                isNextTask={isNextTask}
                onToggleMyDay={handleToggleMyDay}
              />
            </>
          )}
        </div>
        <div className={myDayMinimized ? "w-0 overflow-hidden transition-all duration-300" : "w-full mb-8 min-w-0 transition-all duration-300"}>
          {!myDayMinimized && (
            <>
              <h2 className="text-2xl font-bold mb-6">My Day</h2>
              <MyDayView
                tasks={myDayTasks}
                onRemoveFromMyDay={(task) => handleToggleMyDay(task, false)}
                onComplete={async (id, completed) => {
                  setTasks((prevTasks) =>
                    prevTasks.map((task) =>
                      (task._id === id || task.id === id)
                        ? { ...task, completed }
                        : task
                    )
                  );
                  setFilteredTasks((prevTasks) =>
                    prevTasks.map((task) =>
                      (task._id === id || task.id === id)
                        ? { ...task, completed }
                        : task
                    )
                  );
                  setSortedTasks((prevTasks) =>
                    prevTasks.map((task) =>
                      (task._id === id || task.id === id)
                        ? { ...task, completed }
                        : task
                    )
                  );
                  try {
                    const response = await fetch(`/api/tasks/${id}/myday`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ myDay: false, myDayDate: null, completed: true }),
                    });
                    const result = await response.json();
                    if (!result.success) {
                      throw new Error(result.error || "Failed to update task");
                    }
                    toast({
                      title: completed ? "Task completed" : "Task reopened",
                      description: completed ? "Great job!" : "Task has been reopened",
                    });
                    fetchData();
                  } catch (error) {
                    setTasks((prevTasks) =>
                      prevTasks.map((task) =>
                        (task._id === id || task.id === id)
                          ? { ...task, completed: !completed }
                          : task
                      )
                    );
                    setFilteredTasks((prevTasks) =>
                      prevTasks.map((task) =>
                        (task._id === id || task.id === id)
                          ? { ...task, completed: !completed }
                          : task
                      )
                    );
                    setSortedTasks((prevTasks) =>
                      prevTasks.map((task) =>
                        (task._id === id || task.id === id)
                          ? { ...task, completed: !completed }
                          : task
                      )
                    );
                    toast({
                      title: "Error",
                      description: "Failed to update task",
                      variant: "destructive",
                    });
                  }
                }}
                onViewTask={handleViewTask}
                jobs={jobs}
                ownerMap={ownerMap}
                businessFunctionMap={businessFunctionMap}
                isNextTask={isNextTask}
                onDeleteTask={handleDeleteTask}
                onAddToCalendar={handleAddToCalendar}
              />
            </>
          )}
        </div>
      </Split>
      </div>
    </div>
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
                handleCompleteTaskConfirmed(taskToComplete.id, true);
                setCompleteDialogOpen(false);
              }
            }}
          >
            Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <TaskDialog
      mode={dialogMode}
      open={taskDialogOpen}
      onOpenChange={setTaskDialogOpen}
      onSubmit={handleTaskSubmit}
      initialData={editingTask}
      jobs={jobs}
      jobId={dialogMode === 'create' ? selectedJobForSidebar?.id : undefined}
    />
  </>
);
}