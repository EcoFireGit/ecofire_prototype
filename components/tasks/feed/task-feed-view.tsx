"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { NextTasks } from "@/components/tasks/feed/tasks";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog-jobselector";
import { TaskDetailsSidebar } from "@/components/tasks/task-details-sidebar";
import FilterComponent from "@/components/filters/filter-component";
import TaskSortingComponent from "@/components/sorting/task-sorting-component";
import { Plus, PawPrint, Calendar, Briefcase, FileText, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getPrioriCalendarId } from "@/lib/services/gcal.service";
import { Job } from "@/components/jobs/table/columns";
import { Task } from "../types";
import type { Jobs } from "@/lib/models/job.model";
import { TasksSidebar } from "@/components/tasks/tasks-sidebar";
import MyDayView from "./my-day-view";
import Split from 'react-split';
import { DuplicateTaskDialog } from "../duplicate-task-dialog";

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
  const [businessFunctionMap, setBusinessFunctionMap] = useState
    Record<string, string>
  >({});
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [owners, setOwners] = useState<{ _id: string; name: string }[]>([]);
  const [businessFunctions, setBusinessFunctions] = useState
    { id: string; name: string }[]
  >([]);
  const { toast } = useToast();
  const [tags, setTags] = useState<{ _id: string; name: string }[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

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
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [taskToDuplicate, setTaskToDuplicate] = useState<Task | null>(null);
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
    // Only allow dragging on desktop
    if (isMobile) return;
    setSplitSizes(sizes);
  }, [isMobile]);

  // Handler for Split drag end
  const handleSplitDragEnd = useCallback((sizes: number[]) => {
    // Only allow resizing on desktop
    if (isMobile) return;
    
    // If left pane is less than 40%, minimize it
    if (sizes[0] < 40) {
      setMainMinimized(true);
      setMyDayMinimized(false);
      setSplitSizes([2.8, 100]);
      setShowTabs(false);
      // Show tabs after animation completes
      setTimeout(() => setShowTabs(true), 300);
    } else if (sizes[1] < 40) {
      setMainMinimized(false);
      setMyDayMinimized(true);
      setSplitSizes([97, 3]);
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
      console.log('Fetched tasks:', allTasks);

      // Remove any duplicate tasks
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

  // Function to sort tasks - earliest do-date first, then next tasks, then impact score
  const sortTasks = (tasks: any[], jobsMap: Record<string, any>) => {
    return [...tasks].sort((a, b) => {
      // First sort by earliest do-date (ascending - earliest first)
      if (a.date && b.date) {
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
      } else if (a.date && !b.date) {
        return -1; // Tasks with dates come before tasks without dates
      } else if (!a.date && b.date) {
        return 1;
      }

      // If dates are the same (or both null), check next task status
      const aIsNextTask = a.jobId && jobsMap[a.jobId]?.nextTaskId === a._id;
      const bIsNextTask = b.jobId && jobsMap[b.jobId]?.nextTaskId === b._id;

      if (aIsNextTask && !bIsNextTask) return -1;
      if (!aIsNextTask && bIsNextTask) return 1;

      // If both are next tasks (or both are not), sort by job impact score (higher first)
      if (aIsNextTask && bIsNextTask) {
        const aImpact = jobsMap[a.jobId]?.impact || 0;
        const bImpact = jobsMap[b.jobId]?.impact || 0;
        return bImpact - aImpact;
      }

      // For non-next tasks, also sort by impact score
      const aImpact = jobsMap[a.jobId]?.impact || 0;
      const bImpact = jobsMap[b.jobId]?.impact || 0;
      return bImpact - aImpact;
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

    let filtered;
    if (Object.keys(filters).length === 0) {
      // If no filters are active, show all tasks
      filtered = tasks;
    } else {
      // Filter tasks based on the provided filters
      filtered = tasks.filter((task) => {
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
              if (!Array.isArray(value)) break;
            
              // If "none" is selected, show only tasks with no tags
              if (value.includes("none")) {
                if (task.tags && Array.isArray(task.tags) && task.tags.length > 0) {
                  matches = false;
                }
                // If task.tags is undefined or empty, matches remains true
                break;
              }
            
              // If nothing is selected, don't filter by tags
              if (value.length === 0) break;
            
              // Otherwise, filter by selected tags
              if (!task.tags || !Array.isArray(task.tags)) {
                matches = false;
                break;
              }
            
              // Convert selected tag IDs to tag names
              const selectedTagNames = value
                .map((tagId) => {
                  const tag = tags.find((t) => t._id === tagId);
                  return tag ? tag.name : null;
                })
                .filter(Boolean);
            
              // Check that all selected tag names are present in the task's tags
              if (!selectedTagNames.every((tagName) => task.tags.includes(tagName))) {
                matches = false;
              }
              break;
            
        }
      });

        return matches;
      });
    }

    setFilteredTasks(filtered);
    // Also update sorted tasks to reflect the new filtered set
    setSortedTasks(filtered);
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
      // Use more appropriate breakpoints: mobile < 768px, tablet < 1024px
      const isMobileDevice = window.innerWidth < 768;
      const isTabletDevice = window.innerWidth < 1024;
      setIsMobile(isMobileDevice || isTabletDevice);
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
      setSplitSizes([97, 3]);
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
      const response = await fetch("/api/gcal/calendars/prioriwise");
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
    const today = new Date().toLocaleDateString('en-CA');
    try {
      const res = await fetch(`/api/tasks/${taskId}/myday`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myDay: value, myDayDate: value ? today : null }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setTasks((prev) => prev.map((t) => ((t.id || (t as any)._id) === taskId ? { ...t, myDay: value, myDayDate: value ? today : undefined } : t)));
