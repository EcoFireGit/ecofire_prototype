// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import QBOProgressChart from "@/components/dashboard/qbo-progress-chart";
import { QBOs } from "@/lib/models/qbo.model";
import { Job } from "@/components/jobs/table/columns";
import { JobCard } from "@/components/jobs/job-card";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TasksSidebar } from "@/components/tasks/tasks-sidebar";

export default function Dashboard() {
  const [qbos, setQbos] = useState<QBOs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topJobs, setTopJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [tasksSidebarOpen, setTasksSidebarOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchQBOs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/qbos");
      const data = await response.json();

      if (data.success) {
        setQbos(data.data);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch QBOs");
      }
    } catch (err) {
      setError("An error occurred while fetching QBOs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setJobsLoading(true);

      // Fetch jobs
      const response = await fetch("/api/jobs");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch jobs");
      }

      // Fetch business functions to map IDs to names
      const bfResponse = await fetch("/api/business-functions");
      const bfResult = await bfResponse.json();

      // Create a map of business function IDs to names
      const businessFunctionMap: Record<string, string> = {};
      if (bfResult.success && Array.isArray(bfResult.data)) {
        bfResult.data.forEach((bf: any) => {
          if (bf._id && bf.name) {
            businessFunctionMap[bf._id] = bf.name;
          }
        });
      }

      // Convert API response to Job format with resolved business function names
      let jobs = result.data.map((job: any) => ({
        id: job._id,
        title: job.title,
        notes: job.notes || undefined,
        businessFunctionId: job.businessFunctionId || undefined,
        businessFunctionName:
          job.businessFunctionId && businessFunctionMap[job.businessFunctionId]
            ? businessFunctionMap[job.businessFunctionId]
            : job.businessFunctionName || undefined,
        dueDate: job.dueDate ? new Date(job.dueDate).toISOString() : undefined,
        isDone: job.isDone || false,
        nextTaskId: job.nextTaskId || undefined,
        tasks: job.tasks || [],
        impact: job.impact || 0,
      }));

      // Filter active jobs only
      jobs = jobs.filter((job: Job) => !job.isDone);

      // Sort jobs - can add more complex sorting logic here as needed
      // For now, simple sorting by impact score (higher is better)
      // Ensure impact values are defined with fallback to 0
      jobs.sort((a: Job, b: Job) => (b.impact || 0) - (a.impact || 0));

      // Get the top 5 jobs
      const top5Jobs = jobs.slice(0, 5);
      setTopJobs(top5Jobs);

      // Fetch task owners for the top jobs
      if (top5Jobs.length > 0) {
        const taskIds = top5Jobs
          .filter((job: Job) => job.nextTaskId)
          .map((job: Job) => job.nextTaskId as string);

        if (taskIds.length > 0) {
          await fetchTaskOwners(taskIds);
        }
        
        // Fetch task counts for the top jobs
        await fetchTaskCounts(top5Jobs.map(job => job.id));
      }
    } catch (error) {
      console.error("Error fetching job data:", error);
      toast({
        title: "Error",
        description: "Failed to load job data",
        variant: "destructive",
      });
    } finally {
      setJobsLoading(false);
    }
  };

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

      tasks.forEach((task: any) => {
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
    } catch (error) {
      console.error("Error creating task owner mapping:", error);
    }
  };

  useEffect(() => {
    fetchQBOs();
    fetchJobs();
    // The fetchJobs function will call fetchTaskCounts for the top jobs
  }, []);

  const handleOpenTasksSidebar = (job: Job) => {
    // Open the tasks sidebar directly instead of redirecting
    setSelectedJob(job);
    setTasksSidebarOpen(true);
  };

  const fetchTaskCounts = async (jobIds: string[]) => {
    if (jobIds.length === 0) return;
    
    try {
      // Construct query string with all job IDs
      const queryString = jobIds.map(id => `ids=${id}`).join('&');
      const response = await fetch(`/api/jobs/progress?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch task counts');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTaskCounts(result.data);
      }
    } catch (error) {
      console.error('Error fetching task counts:', error);
    }
  };

  const handleSelectJob = (jobId: string, checked: boolean) => {
    // Not used in dashboard, but required by JobCard component
  };

  return (
    <div className="w-full px-4 py-8 max-w-full" style={{ maxWidth: "100vw" }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button
          onClick={() => {
            fetchQBOs();
            fetchJobs();
          }}
          variant="outline"
          disabled={loading || jobsLoading}
          className="flex items-center gap-2"
        >
          {(loading || jobsLoading) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* Tasks Sidebar */}
      <TasksSidebar
        open={tasksSidebarOpen}
        onOpenChange={setTasksSidebarOpen}
        selectedJob={selectedJob}
      />

      <div
        className="w-full max-w-none space-y-8"
        style={{ overflowX: "visible" }}
      >
        {/* QBO Progress Chart */}
        <section className="w-full max-w-none" style={{ minWidth: "100%" }}>
          {loading && qbos.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="ml-2">Loading QBO data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p>{error}</p>
            </div>
          ) : (
            <div className="w-full">
              <QBOProgressChart
                qbos={qbos}
                onRefresh={fetchQBOs}
                width="100%"
              />
            </div>
          )}
        </section>

        {/* Top 5 Recommended Jobs */}
        <section className="w-full max-w-none" style={{ minWidth: "100%" }}>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Top Impactful Jobs</h2>
            <Button
              variant="ghost"
              onClick={() => router.push("/jobs")}
              className="text-sm flex items-center"
            >
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {jobsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="ml-2">Loading jobs...</p>
            </div>
          ) : topJobs.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded mb-6 text-center">
              <p>No active jobs found. Create your first job to get started.</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/jobs?open=true")}
              >
                Create Job
              </Button>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-lg bg-white">
              <div className="w-full overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Jobs</th>
                      <th className="px-6 py-3">Business Function</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topJobs.map((job) => {
                      // Parse due date for formatting
                      let formattedDate = "No due date";
                      if (job.dueDate) {
                        const date = new Date(job.dueDate);
                        formattedDate = date.toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "2-digit",
                        });
                      }

                      // Generate a consistent color for a business function
                      const getBusinessFunctionColor = () => {
                        const businessFunctionName = job.businessFunctionName || "None";
                        // Generate a hash code from the function name
                        const hashCode = businessFunctionName.split('').reduce((acc, char) => {
                          return char.charCodeAt(0) + ((acc << 5) - acc);
                        }, 0);
                        
                        // Map to HSL color space for better distribution of colors
                        const h = Math.abs(hashCode % 360);
                        const s = 85; // Keep saturation fixed for better readability
                        const l = 88; // Higher lightness for background with dark text
                        
                        return {
                          backgroundColor: `hsl(${h},${s}%,${l}%)`,
                          color: `hsl(${h},${s}%,30%)`
                        };
                      };

                      // Get task count with completion information
                      const getTaskCount = () => {
                        // Get the task counts from our taskCounts state
                        const completed = taskCounts[job.id]?.completed || 0;
                        const total = taskCounts[job.id]?.total || 0;
                        
                        // If there are no tasks, show "No tasks added"
                        if (total === 0) {
                          return "No tasks added";
                        }
                        
                        return `${completed} of ${total} tasks done`;
                      };

                      const businessFuncStyle = getBusinessFunctionColor();

                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleOpenTasksSidebar(job)}
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div>
                              {job.title}
                              <div className="text-xs text-gray-500 mt-1">
                                {getTaskCount()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {job.businessFunctionName ? (
                              <span
                                className="inline-flex items-center rounded-md px-3 py-1 text-sm"
                                style={businessFuncStyle}
                              >
                                {job.businessFunctionName}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
