
// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import QBOProgressChart from '@/components/dashboard/qbo-progress-chart';
import { QBOs } from '@/lib/models/qbo.model';
import { Job } from '@/components/jobs/table/columns';
import { JobCard } from '@/components/jobs/job-card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [qbos, setQbos] = useState<QBOs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topJobs, setTopJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
  const router = useRouter();
  const { toast } = useToast();

  const fetchQBOs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qbos');
      const data = await response.json();
      
      if (data.success) {
        setQbos(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch QBOs');
      }
    } catch (err) {
      setError('An error occurred while fetching QBOs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setJobsLoading(true);
      
      // Fetch jobs
      const response = await fetch('/api/jobs');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch jobs');
      }
      
      // Fetch business functions to map IDs to names
      const bfResponse = await fetch('/api/business-functions');
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
        businessFunctionName: job.businessFunctionId && businessFunctionMap[job.businessFunctionId] 
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
      jobs.sort((a: Job, b: Job) => b.impact - a.impact);
      
      // Get the top 5 jobs
      const top5Jobs = jobs.slice(0, 5);
      setTopJobs(top5Jobs);
      
      // Fetch task owners for the top jobs
      if (top5Jobs.length > 0) {
        const taskIds = top5Jobs
          .filter(job => job.nextTaskId)
          .map(job => job.nextTaskId as string);
          
        if (taskIds.length > 0) {
          await fetchTaskOwners(taskIds);
        }
      }
      
    } catch (error) {
      console.error('Error fetching job data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job data',
        variant: 'destructive',
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
  }, []);

  const handleOpenTasksSidebar = (job: Job) => {
    router.push(`/dashboard/jobs?jobId=${job.id}`);
  };

  const handleSelectJob = (jobId: string, checked: boolean) => {
    // Not used in dashboard, but required by JobCard component
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          {(loading || jobsLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
          Refresh Data
        </Button>
      </div>
      
      <div className="flex flex-col gap-8 w-full">
        {/* QBO Progress Chart */}
        <div className="w-full">
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
            <div>
              <QBOProgressChart 
                qbos={qbos} 
                width="100%" 
                onRefresh={fetchQBOs}
              />
            </div>
          )}
        </div>
        
        {/* Top 5 Recommended Jobs */}
        <div className="w-full">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Top Impactful Jobs</h2>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard/jobs')}
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
                onClick={() => router.push('/dashboard/jobs?open=true')}
              >
                Create Job
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {topJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onEdit={() => router.push(`/dashboard/jobs?edit=${job.id}`)}
                  onDelete={(id) => console.log("Delete not available in dashboard view")}
                  onSelect={handleSelectJob}
                  onOpenTasksSidebar={handleOpenTasksSidebar}
                  isSelected={false}
                  taskOwnerMap={taskOwnerMap}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
