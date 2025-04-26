"use client";

import { useState, useEffect } from "react";
import { Job } from "@/components/jobs/table/columns";
import { JobCard } from "./job-card";

interface JobsGridProps {
  data: Job[];
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onSelect: (jobId: string, checked: boolean) => void;
  onOpenTasksSidebar: (job: Job) => void;
  taskOwnerMap?: Record<string, string>;
  selectedJobs: Set<string>;
}

export function JobsGrid({
  data,
  onEdit,
  onDelete,
  onSelect,
  onOpenTasksSidebar,
  taskOwnerMap,
  selectedJobs
}: JobsGridProps) {
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [loading, setLoading] = useState(false);

  // Fetch task counts for all jobs in a single API call
  useEffect(() => {
    const fetchTaskCounts = async () => {
      if (data.length === 0) return;
      
      try {
        setLoading(true);
        const jobIds = data.map(job => job.id);
        
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskCounts();
  }, [data]);

  return (
    <div className="w-full grid grid-cols-1 gap-6">
      {data.length > 0 ? (
        data.map((job) => (
          <div key={job.id} style={{ width: '100%' }}>
            <JobCard
              job={job}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelect={onSelect}
              onOpenTasksSidebar={onOpenTasksSidebar}
              isSelected={selectedJobs.has(job.id)}
              taskOwnerMap={taskOwnerMap}
              taskCounts={taskCounts}
            />
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-gray-500 border rounded-md">
          No jobs found.
        </div>
      )}
    </div>
  );
}