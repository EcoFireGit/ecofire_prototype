// components/jobs/job-skeleton.tsx
"use client";

import React from "react";

export function JobSkeleton() {
  return (
    <div className="bg-gray-50 rounded-md border border-gray-200 p-4 mb-4 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Checkbox skeleton */}
        <div className="w-5 h-5 mt-1 rounded bg-gray-200"></div>
        
        <div className="flex-1">
          {/* Function label */}
          <div className="flex justify-between mb-2">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          
          {/* Job title */}
          <div className="h-6 w-48 bg-gray-300 rounded mb-4"></div>
          
          {/* Task completion and due date */}
          <div className="flex flex-col gap-1 mb-1">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-4 w-40 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded bg-gray-200"></div>
          <div className="w-8 h-8 rounded bg-gray-200"></div>
          <div className="w-8 h-8 rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}

// You can also create a SkeletonGroup component for multiple skeletons
export function JobSkeletonGroup({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <JobSkeleton key={index} />
      ))}
    </>
  );
}