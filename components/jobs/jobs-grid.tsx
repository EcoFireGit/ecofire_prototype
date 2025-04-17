"use client";

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