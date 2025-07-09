"use client";
import React, { useEffect, useState } from "react";
import { Jobs } from "@/lib/models/job.model";
import { BusinessFunctionForDropdown } from "@/lib/models/business-function.model";
import { Job, columns } from "@/components/jobs/table/columns";
import { DataTable } from "@/components/jobs/table/jobs-table";
import { JobDialog } from "@/components/jobs/job-dialog";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUp, LayoutGrid, LayoutList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { completedColumns } from "@/components/jobs/table/completedColumns";
import { TasksSidebar } from "@/components/tasks/tasks-sidebar";
import { Task } from "@/components/tasks/types";
import { JobsGrid } from "@/components/jobs/jobs-grid";
import FilterComponent from "@/components/filters/filter-component";
import SortingComponent from "@/components/sorting/sorting-component";
import { useSearchParams } from "next/navigation";
import { StartTourButton, WelcomeModal } from "../onboarding_tour";
import { DebugTourElements } from "../onboarding_tour/debug-helper";
import { QBOCircles } from "@/components/qbo/qbo-circles";
import { JobSkeletonGroup } from "@/components/jobs/job-skeleton";
import { OPEN_TASKS_SIDEBAR_EVENT } from "@/components/landing_page/navbar";

// Updated to include business functions and remove owner
function convertJobsToTableData(
  jobs: Jobs[],
  businessFunctions: BusinessFunctionForDropdown[],
): Job[] {
  return jobs.map((job) => {
    // Find the business function name if it exists
    const businessFunction = job.businessFunctionId
      ? businessFunctions.find((bf) => bf.id === job.businessFunctionId)
      : undefined;

    return {
      id: job._id,
      jobNumber: job.jobNumber,
      title: job.title,
      notes: job.notes || undefined,
      businessFunctionId: job.businessFunctionId || undefined,
      businessFunctionName: businessFunction?.name || undefined,
      dueDate: job.dueDate ? new Date(job.dueDate).toISOString() : undefined,
      createdDate: new Date(job.createdDate!).toISOString(),
      isDone: job.isDone || false,
      nextTaskId: job.nextTaskId || undefined,
      tasks: job.tasks || [],
      impact: job.impact || 0,
      // Owner removed as it's now derived from the next task
    };
  });
}

export default function JobsPage() {
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [filteredActiveJobs, setFilteredActiveJobs] = useState<Job[]>([]);
  const [sortedActiveJobs, setSortedActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [filteredCompletedJobs, setFilteredCompletedJobs] = useState<Job[]>([]);
  const [sortedCompletedJobs, setSortedCompletedJobs] = useState<Job[]>([]);
  const [businessFunctions, setBusinessFunctions] = useState<
    BusinessFunctionForDropdown[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [selectedActiveJobs, setSelectedActiveJobs] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCompletedJobs, setSelectedCompletedJobs] = useState<
    Set<string>
  >(new Set());
  const [tasksSidebarOpen, setTasksSidebarOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [owners, setOwners] = useState<{ _id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ _id: string; name: string }[]>([]);
  const [taskDetails, setTaskDetails] = useState<Record<string, any>>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isTableViewEnabled, setIsTableViewEnabled] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const jobs = React.useMemo(() => {
    const jobsMap: Record<string, any> = {};
    
    [...activeJobs, ...completedJobs].forEach(job => {
      jobsMap[job.id] = {
        _id: job.id,
        title: job.title,
        jobNumber: job.jobNumber,
        businessFunctionId: job.businessFunctionId,
        businessFunctionName: job.businessFunctionName,
        dueDate: job.dueDate,
        isDone: job.isDone,
        nextTaskId: job.nextTaskId,
        tasks: job.tasks,
        impact: job.impact,
        notes: job.notes,
        createdDate: job.createdDate
      };
    });
    
    return jobsMap;
  }, [activeJobs, completedJobs]);

  useEffect(() => {
    // Event handler to open the dialog
    const handleOpenDialog = () => {
      setEditingJob(undefined);
      setDialogOpen(true);
    };

    // Event handler for editing a job from TasksSidebar
    const handleEditJob = (event: any) => {
      if (event.detail && event.detail.job) {
        setEditingJob(event.detail.job);
        setDialogOpen(true);
      }
    };

    // Listen for refreshJobsList event to fetch new jobs after creation
    const handleRefreshJobsList = () => {
      fetchJobs();
    };

    const handleForceJobsRefresh = (event: CustomEvent) => {
      console.log('Force refreshing jobs due to completion status change:', event.detail);
      fetchJobs();
    };

    window.addEventListener("openJobDialog", handleOpenDialog);
    window.addEventListener("open-job-edit", handleEditJob);
    window.addEventListener("refreshJobsList", handleRefreshJobsList);
    window.addEventListener("force-jobs-refresh", handleForceJobsRefresh as EventListener);

    return () => {
      window.removeEventListener("openJobDialog", handleOpenDialog);
      window.removeEventListener("open-job-edit", handleEditJob);
      window.removeEventListener("refreshJobsList", handleRefreshJobsList);
      window.removeEventListener("force-jobs-refresh", handleForceJobsRefresh as EventListener);
    };
  }, []);

  // New: Check for businessFunction in URL params for initial filtering
  useEffect(() => {
    const businessFunctionName = searchParams.get("businessFunction");
    if (businessFunctionName && businessFunctions?.length) {
      const bf = businessFunctions.find(
        (b) => b.name.toLowerCase() === businessFunctionName.toLowerCase(),
      );
      if (bf) {
        setActiveFilters((prev) => ({
          ...prev,
          businessFunctionId: bf.id,
        }));
      }
    }
  }, [searchParams, businessFunctions]);

  // Helper function to sort by recommended criteria
  const sortByRecommended = (jobs: Job[]): Job[] => {
    return [...jobs].sort((a, b) => {
      // First compare due dates (null dates go to the end)
      const dateA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dateB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (dateA !== dateB) {
        return dateA - dateB; // Ascending by date
      }

      // If dates are the same (or both null), sort by impact descending
      const impactA = a.impact || 0;
      const impactB = b.impact || 0;
      return impactB - impactA; // Descending by impact
    });
  };

  // Add this effect to fetch the user preferences
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        const result = await response.json();

        if (result.success) {
          setIsTableViewEnabled(result.data.enableTableView);

          // If table view is not enabled, ensure we're using grid view
          if (!result.data.enableTableView) {
            setViewMode("grid");
          } else {
            // If it is enabled, we can use the stored preference
            const savedViewMode = localStorage.getItem("jobViewMode") as
              | "grid"
              | "table";
            if (
              savedViewMode &&
              (savedViewMode === "grid" || savedViewMode === "table")
            ) {
              setViewMode(savedViewMode);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user preferences:", error);
      }
    };

    fetchUserPreferences();
  }, []); // Empty dependency array is correct here as we only want to run this once

  const fetchBusinessFunctions = async () => {
    try {
      const response = await fetch("/api/business-functions");
      const result = await response.json();

      if (result.success) {
        const functions = result.data.map((bf: any) => ({
          id: bf._id,
          name: bf.name,
        }));
        setBusinessFunctions(functions);
        return functions;
      }
      return [];
    } catch (error) {
      console.error("Error fetching business functions:", error);
      return [];
    }
  };

  // Function to fetch all owners
  const fetchOwners = async () => {
    try {
      const response = await fetch("/api/owners");
      const result = await response.json();

      let ownersData: { _id: string; name: string }[] = [];

      if (Array.isArray(result)) {
        ownersData = result.map((owner) => ({
          _id: owner._id,
          name: owner.name,
        }));
      } else if (result.data && Array.isArray(result.data)) {
        ownersData = result.data.map((owner: any) => ({
          _id: owner._id,
          name: owner.name,
        }));
      }

      setOwners(ownersData);
      return ownersData;
    } catch (error) {
      console.error("Error fetching owners:", error);
      return [];
    }
  };

  // Add a fetchTags function
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

  // New improved fetchTaskOwners function to properly map owner names
  const fetchTaskOwners = async (taskIds: string[]) => {
    if (!taskIds.length) return;

    try {
      // First, fetch all owners for this user
      const ownersResponse = await fetch("/api/owners");
      const ownersResult = await ownersResponse.json();

      let ownerMap: Record<string, string> = {};

      // Check the structure of the owners response
      if (Array.isArray(ownersResult)) {
        // Case 1: API returns direct array of owners
        ownersResult.forEach((owner) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      } else if (ownersResult.data && Array.isArray(ownersResult.data)) {
        // Case 2: API returns { data: [...owners] }
        ownersResult.data.forEach((owner: any) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      }

      // Now fetch the tasks with the owner IDs we want to map
      const queryParams = new URLSearchParams();
      taskIds.forEach((id) => queryParams.append("ids", id));

      const tasksResponse = await fetch(
        `/api/tasks/batch?${queryParams.toString()}`,
      );
      const tasksResult = await tasksResponse.json();

      if (!tasksResult.success && !tasksResult.data) {
        console.error("Tasks API did not return success or data");
        return;
      }

      const tasks = tasksResult.data || tasksResult;

      // Map task IDs to owner names
      const taskOwnerMapping: Record<string, string> = {};

      // Also store the detailed task information for filtering
      const taskDetailsMap: Record<string, any> = {};

      tasks.forEach((task: any) => {
        // Store task details for filtering
        taskDetailsMap[task.id || task._id] = task;

        // In your system, task.owner should be the owner ID
        if (task.owner && typeof task.owner === "string") {
          // Look up the owner name from our previously built map
          taskOwnerMapping[task.id || task._id] =
            ownerMap[task.owner] || "Not assigned";
        } else {
          taskOwnerMapping[task.id || task._id] = "Not assigned";
        }
      });

      // Update the state with our new mapping
      setTaskOwnerMap(taskOwnerMapping);
      setTaskDetails(taskDetailsMap);
    } catch (error) {
      console.error("Error creating task owner mapping:", error);
    }
  };

  // Function to handle active job selection
  const handleActiveSelect = (jobId: string, checked: boolean) => {
    setSelectedActiveJobs((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(jobId);
      } else {
        newSet.delete(jobId);
      }
      return newSet;
    });
  };

  // Function to handle completed job selection
  const handleCompletedSelect = (jobId: string, checked: boolean) => {
    setSelectedCompletedJobs((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(jobId);
      } else {
        newSet.delete(jobId);
      }
      return newSet;
    });
  };

  // Function to mark selected active jobs as done
  const handleMarkAsDone = async () => {
    try {
      const jobIds = Array.from(selectedActiveJobs);

      // Make API call to update all selected jobs
      const promises = jobIds.map((id) =>
        fetch(`/api/jobs/${id}?updateTasks=true`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isDone: true }),
        }),
      );

      await Promise.all(promises);

      // Move selected jobs from active to completed
      const jobsToMove = activeJobs.filter((job) =>
        selectedActiveJobs.has(job.id),
      );
      const updatedJobs = jobsToMove.map((job) => ({ ...job, isDone: true }));

      setActiveJobs((prev) =>
        prev.filter((job) => !selectedActiveJobs.has(job.id)),
      );
      setCompletedJobs((prev) => [...prev, ...updatedJobs]);

      // Also update filtered jobs
      setFilteredActiveJobs((prev) =>
        prev.filter((job) => !selectedActiveJobs.has(job.id)),
      );
      setFilteredCompletedJobs((prev) => [...prev, ...updatedJobs]);

      // Clear selection
      setSelectedActiveJobs(new Set());

      toast({
        title: "Success",
        description: "Selected jobs marked as complete",
      });
    } catch (error) {
      console.error("Error marking jobs as done:", error);
      toast({
        title: "Error",
        description: "Failed to update jobs",
        variant: "destructive",
      });
    }
  };

  // Function to mark selected completed jobs as active
  const handleMarkAsActive = async () => {
    try {
      const jobIds = Array.from(selectedCompletedJobs);

      // Make API call to update all selected completed jobs
      const promises = jobIds.map((id) =>
        fetch(`/api/jobs/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isDone: false }),
        }),
      );

      await Promise.all(promises);

      // Move selected jobs from completed to active
      const jobsToMove = completedJobs.filter((job) =>
        selectedCompletedJobs.has(job.id),
      );
      const updatedJobs = jobsToMove.map((job) => ({ ...job, isDone: false }));

      setCompletedJobs((prev) =>
        prev.filter((job) => !selectedCompletedJobs.has(job.id)),
      );
      setActiveJobs((prev) => [...prev, ...updatedJobs]);

      // Also update filtered jobs
      setFilteredCompletedJobs((prev) =>
        prev.filter((job) => !selectedCompletedJobs.has(job.id)),
      );
      setFilteredActiveJobs((prev) => [...prev, ...updatedJobs]);

      // Clear selection
      setSelectedCompletedJobs(new Set());

      toast({
        title: "Success",
        description: "Selected jobs moved back to active",
      });
    } catch (error) {
      console.error("Error marking jobs as active:", error);
      toast({
        title: "Error",
        description: "Failed to update jobs",
        variant: "destructive",
      });
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
    
      // First fetch business functions
      const bfResponse = await fetch("/api/business-functions");
      const bfResult = await bfResponse.json();

      let currentBusinessFunctions = [];
      if (bfResult.success) {
        currentBusinessFunctions = bfResult.data.map((bf: any) => ({
          id: bf._id,
          name: bf.name,
        }));
        // Update state for later use
        setBusinessFunctions(currentBusinessFunctions);
      }

      // Also fetch owners for filters
      await fetchOwners();
      // Fetch tags for filters
      await fetchTags();
      
      // Then fetch jobs
      const jobsResponse = await fetch("/api/jobs");
      const jobsResult = await jobsResponse.json();
      
      if (jobsResult.success) {
        // Collect all next task IDs to fetch their owners
        const taskIds = jobsResult.data
          .filter((job: any) => job.nextTaskId)
          .map((job: any) => job.nextTaskId);

        // Fetch task owners if any tasks exist
        if (taskIds.length > 0) {
          await fetchTaskOwners(taskIds);
        } else {
          setTaskOwnerMap({});
          setTaskDetails({});
        }

        // Use the business functions we just fetched
        const allJobs = convertJobsToTableData(
          jobsResult.data,
          currentBusinessFunctions,
        );

        // Separate active and completed jobs
        const activeJobs = allJobs.filter((job) => !job.isDone);
        const completedJobs = allJobs.filter((job) => job.isDone);

        // Apply sorting to the initial jobs
        const sortedActiveJobs = sortByRecommended(activeJobs);
        const sortedCompletedJobs = sortByRecommended(completedJobs);

        setActiveJobs(activeJobs);
        setFilteredActiveJobs(activeJobs);
        setSortedActiveJobs(sortedActiveJobs);
        setCompletedJobs(completedJobs);
        setFilteredCompletedJobs(completedJobs);
        setSortedCompletedJobs(sortedCompletedJobs);
      } else {
        setError(jobsResult.error);
      }
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    // Check if "open=true" is in the URL
    const shouldOpenDialog = searchParams.get("open") === "true";

    // If the parameter exists, open the dialog in create mode
    if (shouldOpenDialog) {
      setEditingJob(undefined);
      setDialogOpen(true);
    }
  }, [searchParams]);

  const handleFilterChange = (filters: Record<string, any>) => {
    setActiveFilters(filters);

    if (Object.keys(filters).length === 0) {
      setFilteredActiveJobs(activeJobs);
      setFilteredCompletedJobs(completedJobs);
      setSortedActiveJobs(sortByRecommended(activeJobs));
      setSortedCompletedJobs(sortByRecommended(completedJobs));
      return;
    }

    // Filter active jobs
    const filteredActive = activeJobs.filter((job) => {
      return matchesFilters(job, filters);
    });

    // Filter completed jobs - only apply non-status filters
    const nonStatusFilters = { ...filters };
    delete nonStatusFilters.isDone;

    const filteredCompleted = completedJobs.filter((job) => {
      if (filters.isDone === true) {
        return matchesFilters(job, nonStatusFilters);
      } else {
        return false;
      }
    });

    setFilteredActiveJobs(filteredActive);
    setFilteredCompletedJobs(filteredCompleted);
    setSortedActiveJobs(sortByRecommended(filteredActive));
    setSortedCompletedJobs(sortByRecommended(filteredCompleted));
  };

  // Helper function to check if a job matches filters
  const matchesFilters = (job: Job, filters: Record<string, any>): boolean => {
    let matches = true;
    const nextTask = job.nextTaskId ? taskDetails[job.nextTaskId] : null;

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value === "" ||
        value === null ||
        value === undefined ||
        value === "any"
      )
        return;

      switch (key) {
        case "businessFunctionId":
          if (job.businessFunctionId !== value) matches = false;
          break;
        case "dueDate":
          if (!job.dueDate || new Date(job.dueDate) > new Date(value))
            matches = false;
          break;
        case "isDone":
          if (job.isDone !== value) matches = false;
          break;
        case "focusLevel":
          if (!nextTask || nextTask.focusLevel !== value) matches = false;
          break;
        case "joyLevel":
          if (!nextTask || nextTask.joyLevel !== value) matches = false;
          break;
        case "owner":
          if (!nextTask || nextTask.owner !== value) matches = false;
          break;
        case "minHours":
          if (
            !nextTask ||
            !nextTask.requiredHours ||
            nextTask.requiredHours < value
          )
            matches = false;
          break;
        case "maxHours":
          if (
            !nextTask ||
            !nextTask.requiredHours ||
            nextTask.requiredHours > value
          )
            matches = false;
          break;
        case "tags":
          if (!Array.isArray(value) || value.length === 0) break;

          if (!nextTask || !nextTask.tags || !Array.isArray(nextTask.tags)) {
            matches = false;
            break;
          }

          const selectedTagNames = value
            .map((tagId) => {
              const tag = tags.find((t) => t._id === tagId);
              return tag ? tag.name : null;
            })
            .filter(Boolean);

          if (
            !selectedTagNames.every((tagName) =>
              nextTask.tags.includes(tagName),
            )
          ) {
            matches = false;
          }
          break;
      }
    });

    return matches;
  };

  useEffect(() => {
    if (!loading && activeJobs.length > 0) {
      if (Object.keys(activeFilters).length > 0) {
        const filteredActive = activeJobs.filter((job) => {
          return matchesFilters(job, activeFilters);
        });

        const nonStatusFilters = { ...activeFilters };
        delete nonStatusFilters.isDone;

        const filteredCompleted = completedJobs.filter((job) => {
          if (activeFilters.isDone === true) {
            return matchesFilters(job, nonStatusFilters);
          } else {
            return false;
          }
        });

        setFilteredActiveJobs(filteredActive);
        setFilteredCompletedJobs(filteredCompleted);
        setSortedActiveJobs(sortByRecommended(filteredActive));
        setSortedCompletedJobs(sortByRecommended(filteredCompleted));
      }
    }
  }, [loading, activeJobs, completedJobs, activeFilters, taskDetails, tags]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobIdToOpen = params.get("openTaskSidebarFor");
    if (jobIdToOpen) {
      // Find the job in active or completed jobs
      const job =
        activeJobs.find((j) => j.id === jobIdToOpen) ||
        completedJobs.find((j) => j.id === jobIdToOpen);
      if (job) {
        handleOpenTasksSidebar(job);
        // Remove the param so it doesn't reopen on further updates
        params.delete("openTaskSidebarFor");
        window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      }
    }
  }, [activeJobs, completedJobs]);
  
  const handleActiveSortChange = (sortedJobs: Job[]) => {
    setSortedActiveJobs(sortedJobs);
  };

  const handleCompletedSortChange = (sortedJobs: Job[]) => {
    setSortedCompletedJobs(sortedJobs);
  };

  // ---- CRITICAL FIXES ----

  // Only allow sidebar to open for a job after jobs have been refreshed!
  const handleCreate = async (jobData: Partial<Job>) => {
    setCreatingJob(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...jobData,
          businessFunctionId: jobData.businessFunctionId,
        }),
      });

      const result = await response.json();

     

      if (result.success) {
        toast({
          title: "Success",
          description: "Job successfully created",
        });
        await fetchJobs(); // Wait to fetch new jobs before closing dialog
        setDialogOpen(false);
       
         
  

      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setCreatingJob(false);
    }
  };

  const handleEdit = async (jobData: Partial<Job>) => {
    if (!editingJob) return;

    try {
      const response = await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...jobData,
          businessFunctionId: jobData.businessFunctionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
        setDialogOpen(false);
        setEditingJob(undefined);
        await fetchJobs(); // Ensure data is fresh before sidebar can open
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}?deleteTasks=true`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job deleted successfully",
        });
        fetchJobs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    setDialogOpen(true);
  };
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingJob(undefined);
    }
  };
  // Always open sidebar with the most up-to-date job object
  const handleOpenTasksSidebar = (job: Job) => {
    // Find the most up-to-date job object from state
    const latestJob = activeJobs.find(j => j.id === job.id) || completedJobs.find(j => j.id === job.id) || job;
    setSelectedJob({ ...latestJob }); // Force new object for rerender
    setTasksSidebarOpen(true);
    setNeedsRefresh(false);
  };

  const handleSidebarClose = (open: boolean) => {
    if (!open && needsRefresh) {
      fetchJobs();
    }
    setTasksSidebarOpen(open);
    if (!open) setSelectedJob(null); // Clear selected job and avoid stale sidebar data
  };

  if (loading) {
    return (
      <div className="p-4 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Jobs</h1>
          <div className="flex gap-2">
            <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse"></div>
            <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-32 h-9 bg-gray-200 rounded-md animate-pulse"
            ></div>
          ))}
        </div>
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="w-full xl:w-1/2 xl:pr-6">
            <JobSkeletonGroup count={4} />
          </div>
          <div className="w-full xl:w-1/2 mb-8 xl:sticky xl:top-20 xl:self-start xl:pl-6 xl:border-l border-gray-200">
            <div className="h-64 rounded-md bg-gray-100 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full">
      <div className="w-full max-w-none">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Jobs</h1>
          <div className="flex gap-2">
            {isTableViewEnabled && (
              <div className="flex items-center border rounded-md overflow-hidden mr-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => {
                    setViewMode("grid");
                    localStorage.setItem("jobViewMode", "grid");
                  }}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => {
                    setViewMode("table");
                    localStorage.setItem("jobViewMode", "table");
                  }}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            )}

            {viewMode === "table" && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/jobs/calculate-impact", {
                      method: "POST",
                    });
                    const result = await response.json();

                    if (result.success) {
                      toast({
                        title: "Success",
                        description: `${result.message}`,
                      });
                      fetchJobs();
                    } else {
                      throw new Error(result.error);
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to calculate job impact values",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Recalculate Impact
              </Button>
            )}
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
          <SortingComponent
            onSortChange={handleActiveSortChange}
            jobs={filteredActiveJobs}
            taskDetails={taskDetails}
          />
        </div>
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="w-full xl:w-1/2 xl:pr-6">
            {viewMode === "grid" ? (
              <JobsGrid
                data={sortedActiveJobs}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onSelect={handleActiveSelect}
                onOpenTasksSidebar={handleOpenTasksSidebar}
                taskOwnerMap={taskOwnerMap}
                selectedJobs={selectedActiveJobs}
              />
            ) : (
              <DataTable
                columns={columns(
                  handleOpenEdit,
                  handleDelete,
                  handleActiveSelect,
                  handleOpenTasksSidebar,
                  taskOwnerMap,
                )}
                data={sortedActiveJobs}
              />
            )}
          </div>
          <div className="w-full xl:w-1/2 mb-8 xl:sticky xl:top-20 xl:self-start xl:pl-6 xl:border-l border-gray-200">
            <QBOCircles
              onSelectJob={(jobId) => {
                const job = [...activeJobs, ...completedJobs].find(
                  (j) => j.id === jobId,
                );
                if (job) {
                  handleOpenTasksSidebar(job);
                }
              }}
            />
          </div>
        </div>
        {(filteredCompletedJobs.length > 0 ||
          activeFilters.isDone === true ||
          Object.keys(activeFilters).length === 0) && (
          <>
            <div className="mt-16 mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Completed Jobs</h2>
              <SortingComponent
                onSortChange={handleCompletedSortChange}
                jobs={filteredCompletedJobs}
                taskDetails={taskDetails}
              />
            </div>
            {viewMode === "grid" ? (
              <JobsGrid
                data={sortedCompletedJobs}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onSelect={handleCompletedSelect}
                onOpenTasksSidebar={handleOpenTasksSidebar}
                taskOwnerMap={taskOwnerMap}
                selectedJobs={selectedCompletedJobs}
              />
            ) : (
              <DataTable
                columns={completedColumns(
                  handleOpenEdit,
                  handleDelete,
                  handleCompletedSelect,
                  handleOpenTasksSidebar,
                  taskOwnerMap,
                )}
                data={sortedCompletedJobs}
              />
            )}
          </>
        )}

        <JobDialog
          mode={editingJob ? "edit" : "create"}
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          onSubmit={editingJob ? handleEdit : handleCreate}
          initialData={editingJob}
        />

        <TasksSidebar
          key={selectedJob?.id}
          open={tasksSidebarOpen}
          onOpenChange={handleSidebarClose}
          selectedJob={selectedJob}
          onRefreshJobs={() => setNeedsRefresh(true)}
          onDeleteJob={handleDelete}
          jobs={jobs} 
        />

        {selectedActiveJobs.size > 0 && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-4 rounded-lg border shadow-lg z-50">
            <span className="text-sm font-medium">
              {selectedActiveJobs.size}{" "}
              {selectedActiveJobs.size === 1 ? "job" : "jobs"} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedActiveJobs(new Set())}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleMarkAsDone}>
              Mark as Done
            </Button>
          </div>
        )}

        {selectedCompletedJobs.size > 0 && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-4 rounded-lg border shadow-lg z-50">
            <span className="text-sm font-medium">
              {selectedCompletedJobs.size}{" "}
              {selectedCompletedJobs.size === 1 ? "job" : "jobs"} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCompletedJobs(new Set())}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleMarkAsActive}>
              <ArrowUp className="mr-2 h-4 w-4" />
              Move to Active
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}