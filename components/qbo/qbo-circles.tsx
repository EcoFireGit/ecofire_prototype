"use client";

import { useState, useEffect } from "react";
import { QBOs } from "@/lib/models/qbo.model";
import { Jobs } from "@/lib/models/job.model";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface QBOCircleProps {
  onSelectJob?: (jobId: string) => void;
}

export function QBOCircles({ onSelectJob }: QBOCircleProps) {
  const [qbos, setQbos] = useState<QBOs[]>([]);
  const [qboJobsMap, setQboJobsMap] = useState<Record<string, Jobs[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQbosAndMappings = async () => {
      try {
        setLoading(true);

        // Fetch all QBOs
        const qboResponse = await fetch("/api/qbos");
        const qboResult = await qboResponse.json();

        if (!qboResult.success) {
          throw new Error("Failed to fetch QBOs");
        }

        const qbosData = qboResult.data;
        setQbos(qbosData);

        // Fetch job mappings for each QBO
        const jobMappingsPromises = qbosData.map(async (qbo: QBOs) => {
          const response = await fetch(
            `/api/qbo-job-mappings?qboId=${qbo._id}`,
          );
          const result = await response.json();

          if (result.success) {
            return { qboId: qbo._id, jobs: result.data };
          }
          return { qboId: qbo._id, jobs: [] };
        });

        const jobMappingsResults = await Promise.all(jobMappingsPromises);

        // Create map of QBO ID to associated jobs
        const qboToJobsMap: Record<string, Jobs[]> = {};
        jobMappingsResults.forEach((result) => {
          qboToJobsMap[result.qboId] = result.jobs;
        });

        setQboJobsMap(qboToJobsMap);
      } catch (error) {
        console.error("Error fetching QBOs and job mappings:", error);
        toast({
          title: "Error",
          description: "Failed to load QBO and job data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQbosAndMappings();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">Loading QBO mappings...</div>
    );
  }

  if (qbos.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No QBOs found.
      </div>
    );
  }

  // Helper function to get a color based on the QBO name (for consistent colors per QBO)
  const getQboColor = (qboName: string) => {
    const colors = [
      "bg-blue-100 border-blue-500 text-blue-800",
      "bg-green-100 border-green-500 text-green-800",
      "bg-purple-100 border-purple-500 text-purple-800",
      "bg-amber-100 border-amber-500 text-amber-800",
      "bg-rose-100 border-rose-500 text-rose-800",
      "bg-cyan-100 border-cyan-500 text-cyan-800",
    ];

    // Simple hash function to ensure same QBO always gets same color
    const hash = qboName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % colors.length;

    return colors[colorIndex];
  };

  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold mb-6 flex items-center justify-center">
        Mission-impact matrix
      </h2>
      <div className="flex flex-col gap-10">
        {qbos.map((qbo) => {
          const jobs = qboJobsMap[qbo._id] || [];
          const colorClass = getQboColor(qbo.name);

          return (
            <div key={qbo._id} className="relative group">
              {/* Calculate size based on QBO points */}
              {(() => {
                // Base size for circles
                const baseSize = 180;
                const baseExpandedSize = 280;

                // Calculate size factor based on points (min 1, max 2)
                // This means circles will be between 1x and 2x the base size
                const pointsValue = qbo.points || 1;
                const sizeFactor = Math.max(
                  1,
                  Math.min(2, 1 + pointsValue / 10),
                );

                // Calculate actual dimensions
                const size = Math.round(baseSize * sizeFactor);
                const expandedSize = Math.round(baseExpandedSize * sizeFactor);

                return (
                  <>
                    {/* Normal circle (displayed by default) */}
                    <Card
                      className={`flex flex-col items-center justify-center p-4 rounded-full border-2 ${colorClass} cursor-pointer transition-all duration-300 ease-in-out overflow-hidden mx-auto group-hover:opacity-0 group-hover:invisible`}
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        minWidth: `${size}px`,
                        minHeight: `${size}px`,
                      }}
                    >
                      <div className="font-bold text-center mb-2">
                        {qbo.name}
                      </div>
                      <div className="text-xs text-center opacity-80">
                        {(() => {
                          // Calculate total points across all QBOs
                          const totalPoints = qbos.reduce(
                            (sum, q) => sum + (q.points || 0),
                            0,
                          );
                          // Calculate percentage for this QBO
                          const percentage =
                            totalPoints > 0
                              ? Math.round((qbo.points / totalPoints) * 100)
                              : 0;
                          return `Mission impact: ${percentage}%`;
                        })()}
                      </div>
                      <div className="mt-2 w-full overflow-hidden text-center">
                        {jobs.length === 0 ? (
                          <div className="text-xs italic">No jobs mapped</div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {jobs.map((job) => (
                              <span
                                key={job._id}
                                className="inline-flex items-center justify-center p-1"
                              >
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M10 13a3 3 0 0 1-3-3V5a3 3 0 0 1 6 0v5a3 3 0 0 1-3 3z" />
                                  <path d="M10 13v3m-4-3h8" />
                                </svg>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Expanded circle (displayed on hover) */}
                    <Card
                      className={`absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center p-5 rounded-3xl border-2 ${colorClass} cursor-pointer transition-all duration-300 ease-in-out opacity-0 invisible group-hover:opacity-100 group-hover:visible max-h-none overflow-y-auto z-10 shadow-lg`}
                      style={{
                        width: `${expandedSize}px`,
                        minHeight: `${expandedSize}px`,
                      }}
                    >
                      <div className="font-bold text-center mb-3 text-lg">
                        {qbo.name}
                      </div>
                      <div className="w-full text-left">
                        {jobs.length === 0 ? (
                          <div className="text-sm italic text-center">
                            No jobs mapped
                          </div>
                        ) : (
                          <ul className="text-sm space-y-2">
                            {jobs.map((job) => (
                              <li
                                key={job._id}
                                className="flex items-center gap-2 p-1.5 hover:bg-white/30 rounded-md transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectJob) onSelectJob(job._id);
                                }}
                              >
                                <svg
                                  className="h-5 w-5 flex-shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M10 13a3 3 0 0 1-3-3V5a3 3 0 0 1 6 0v5a3 3 0 0 1-3 3z" />
                                  <path d="M10 13v3m-4-3h8" />
                                </svg>
                                <span className="hover:underline cursor-pointer">
                                  {job.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Card>
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
