"use client";
import { useEffect, useState } from "react";
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

// Updated to include business functions and remove owner
function convertJobsToTableData(
  jobs: Jobs[],
  businessFunctions: BusinessFunctionForDropdown[]
): Job[] {
  return jobs.map((job) => {
    // Find the business function name if it exists
    const businessFunction = job.businessFunctionId
      ? businessFunctions.find((bf) => bf.id === job.businessFunctionId)
      : undefined;

    return {
      id: job._id,
      title: job.title,
      notes: job.notes || undefined,
      businessFunctionId: job.businessFunctionId || undefined,
      businessFunctionName: businessFunction?.name || undefined,
      dueDate: job.dueDate ? new Date(job.dueDate).toISOString() : undefined,
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
    new Set()
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

  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Effect to update sorted jobs when filtered jobs change
  useEffect(() => {
    setSortedActiveJobs(filteredActiveJobs);
    setSortedCompletedJobs(filteredCompletedJobs);
  }, [filteredActiveJobs, filteredCompletedJobs]);

  // Fetch business functions
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
        `/api/tasks/batch?${queryParams.toString()}`
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
        })
      );

      await Promise.all(promises);

      // Move selected jobs from active to completed
      const jobsToMove = activeJobs.filter((job) =>
        selectedActiveJobs.has(job.id)
      );
      const updatedJobs = jobsToMove.map((job) => ({ ...job, isDone: true }));

      setActiveJobs((prev) =>
        prev.filter((job) => !selectedActiveJobs.has(job.id))
      );
      setCompletedJobs((prev) => [...prev, ...updatedJobs]);

      // Also update filtered jobs
      setFilteredActiveJobs((prev) =>
        prev.filter((job) => !selectedActiveJobs.has(job.id))
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
        })
      );

      await Promise.all(promises);

      // Move selected jobs from completed to active
      const jobsToMove = completedJobs.filter((job) =>
        selectedCompletedJobs.has(job.id)
      );
      const updatedJobs = jobsToMove.map((job) => ({ ...job, isDone: false }));

      setCompletedJobs((prev) =>
        prev.filter((job) => !selectedCompletedJobs.has(job.id))
      );
      setActiveJobs((prev) => [...prev, ...updatedJobs]);

      // Also update filtered jobs
      setFilteredCompletedJobs((prev) =>
        prev.filter((job) => !selectedCompletedJobs.has(job.id))
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
        }

        // Use the business functions we just fetched
        const allJobs = convertJobsToTableData(
          jobsResult.data,
          currentBusinessFunctions
        );

        // Separate active and completed jobs
        const activeJobs = allJobs.filter((job) => !job.isDone);
        const completedJobs = allJobs.filter((job) => job.isDone);

        setActiveJobs(activeJobs);
        setFilteredActiveJobs(activeJobs);
        setSortedActiveJobs(activeJobs);
        setCompletedJobs(completedJobs);
        setFilteredCompletedJobs(completedJobs);
        setSortedCompletedJobs(completedJobs);
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

  // Add this new useEffect to listen for the custom event from the Navbar
  useEffect(() => {
    // Event handler to open the dialog
    const handleOpenDialog = () => {
      setEditingJob(undefined);
      setDialogOpen(true);
    };

    // Add the event listener
    window.addEventListener("openJobDialog", handleOpenDialog);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener("openJobDialog", handleOpenDialog);
    };
  }, []);

  // Function to handle filter changes
  const handleFilterChange = (filters: Record<string, any>) => {
    setActiveFilters(filters);

    if (Object.keys(filters).length === 0) {
      // If no filters are active, show all jobs
      setFilteredActiveJobs(activeJobs);
      setFilteredCompletedJobs(completedJobs);
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
      // If isDone filter is true, show completed jobs, otherwise hide them
      if (filters.isDone === true) {
        return matchesFilters(job, nonStatusFilters);
      } else {
        return false; // Hide completed jobs if not explicitly showing them
      }
    });

    setFilteredActiveJobs(filteredActive);
    setFilteredCompletedJobs(filteredCompleted);
  };

  // Helper function to check if a job matches filters
  const matchesFilters = (job: Job, filters: Record<string, any>): boolean => {
    let matches = true;

    // Get the associated task for this job (if it has a nextTaskId)
    const nextTask = job.nextTaskId ? taskDetails[job.nextTaskId] : null;

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
        // Job filters
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

        // Task filters (applied to the job's next task)
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

          // Convert selected tag IDs to tag names for comparison
          const selectedTagNames = value
            .map((tagId) => {
              const tag = tags.find((t) => t._id === tagId);
              return tag ? tag.name : null;
            })
            .filter(Boolean); // Remove any null values

          // Compare using tag names instead of IDs
          if (
            !selectedTagNames.every((tagName) =>
              nextTask.tags.includes(tagName)
            )
          ) {
            matches = false;
          }
          break;
      }
    });

    return matches;
  };

  // Effect to reapply filters when jobs are loaded
useEffect(() => {
  // Only run this when we have loaded jobs and are not in loading state
  if (!loading && activeJobs.length > 0) {
    // Check if we have activeFilters already set (from initialFilters or previous state)
    if (Object.keys(activeFilters).length > 0) {
      console.log('Reapplying filters on page navigation/load:', activeFilters);
      
      // Reapply the filters to the jobs
      // This is essentially the same as handleFilterChange but we're calling it directly
      // with our existing activeFilters
      
      // Filter active jobs
      const filteredActive = activeJobs.filter((job) => {
        return matchesFilters(job, activeFilters);
      });

      // Filter completed jobs - only apply non-status filters
      const nonStatusFilters = { ...activeFilters };
      delete nonStatusFilters.isDone;

      const filteredCompleted = completedJobs.filter((job) => {
        // If isDone filter is true, show completed jobs, otherwise hide them
        if (activeFilters.isDone === true) {
          return matchesFilters(job, nonStatusFilters);
        } else {
          return false; // Hide completed jobs if not explicitly showing them
        }
      });

      // Update the filtered jobs lists
      setFilteredActiveJobs(filteredActive);
      setFilteredCompletedJobs(filteredCompleted);
    }
  }
}, [loading, activeJobs, completedJobs, activeFilters]);

  // Handler for sort changes
  const handleActiveSortChange = (sortedJobs: Job[]) => {
    setSortedActiveJobs(sortedJobs);
  };

  // Handler for completed jobs sort changes
  const handleCompletedSortChange = (sortedJobs: Job[]) => {
    setSortedCompletedJobs(sortedJobs);
  };

  const handleCreate = async (jobData: Partial<Job>) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...jobData,
          // Ensure we're sending businessFunctionId, not businessFunctionName
          businessFunctionId: jobData.businessFunctionId,
          // No need to send owner as it's derived from the next task
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job created successfully",
        });
        fetchJobs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
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
          // Ensure we're sending businessFunctionId, not businessFunctionName
          businessFunctionId: jobData.businessFunctionId,
          // No need to send owner as it's derived from the next task
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
        fetchJobs();
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

  const handleOpenCreate = () => {
    setEditingJob(undefined);
    setDialogOpen(true);
  };

  // Function to handle opening the tasks sidebar
  const handleOpenTasksSidebar = (job: Job) => {
    setSelectedJob(job);
    setTasksSidebarOpen(true);
    // Reset the needs refresh flag when opening sidebar
    setNeedsRefresh(false);
  };
  const handleSidebarClose = (open: boolean) => {
    // If the sidebar is being closed and we need a refresh
    if (!open && needsRefresh) {
      fetchJobs();
    }

    // Update the sidebar state
    setTasksSidebarOpen(open);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading jobs...</div>
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
            <div className="flex items-center border rounded-md overflow-hidden mr-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>

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
                    fetchJobs(); // Refresh jobs to show updated impact values
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
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create Job
            </Button>
          </div>
        </div>

        {/* Filter and Sort controls */}
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
          {/* Main job grid/table - takes appropriate space based on screen size */}
          <div className="w-full xl:w-1/2 xl:pr-6">
            {viewMode === "grid" ? (
              <JobsGrid
                data={sortedActiveJobs} // Use sorted jobs instead of filtered
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
                  taskOwnerMap
                )}
                data={sortedActiveJobs} // Use sorted jobs instead of filtered
              />
            )}
          </div>
          
          {/* QBO Circles Component - takes appropriate space with padding */}
          <div className="w-full xl:w-1/2 mb-8 xl:sticky xl:top-20 xl:self-start xl:pl-6 xl:border-l border-gray-200">
            <QBOCircles 
              onSelectJob={(jobId) => {
                // Find the job and open its tasks sidebar
                const job = [...activeJobs, ...completedJobs].find(j => j.id === jobId);
                if (job) {
                  handleOpenTasksSidebar(job);
                }
              }} 
            />
          </div>
        </div>

        {/* Show completed jobs section if there are any to display or if no filters are active */}
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
                data={sortedCompletedJobs} // Use sorted jobs instead of filtered
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
                  taskOwnerMap
                )}
                data={sortedCompletedJobs} // Use sorted jobs instead of filtered
              />
            )}
          </>
        )}

        <JobDialog
          mode={editingJob ? "edit" : "create"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={editingJob ? handleEdit : handleCreate}
          initialData={editingJob}
        />

        <TasksSidebar
          open={tasksSidebarOpen}
          onOpenChange={handleSidebarClose}
          selectedJob={selectedJob}
          onRefreshJobs={() => setNeedsRefresh(true)}
        />

        {/* Toast for active jobs selection */}
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

        {/* Toast for completed jobs selection */}
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
