"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

interface SearchResultCardProps {
  result: { 
    id: string; 
    title: string; 
    notes: string; 
    type: string; 
    author?: string;
    businessFunctionId?: string;
    businessFunctionName?: string;
    dueDate?: string;
  };
  index: number;
  onSelect?: (id: string, checked: boolean) => void;
  onOpenTasksSidebar: (result: any) => void;
  isSelected?: boolean;
  taskOwnerMap?: Record<string, string>;
}

export function SearchResultCard({
  result,
  index,
  onSelect,
  onOpenTasksSidebar,
  isSelected = false,
  taskOwnerMap
}: SearchResultCardProps) {
  const router = useRouter();
  const [taskCounts, setTaskCounts] = useState({ total: 0, completed: 0 });
  const [loading, setLoading] = useState<boolean>(false);

  // Function to fetch task counts if result type is job
  const fetchTaskCounts = async () => {
    if (result.type.toLowerCase() !== 'job') return;
    
    try {
      setLoading(true);
      const countsResponse = await fetch('/api/jobs/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: result.id }),
      });
      
      const countsResult = await countsResponse.json();
      
      if (countsResult.success && countsResult.data) {
        setTaskCounts(countsResult.data);
      }
    } catch (error) {
      console.error("Error fetching task counts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (result.id && result.type.toLowerCase() === 'job') {
      fetchTaskCounts();
    }
  }, [result.id, result.type]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get function color
  const getFunctionColor = () => {
    const functionName = result.businessFunctionName?.toLowerCase() || "";
    if (functionName.includes("product")) return "bg-orange-100 text-orange-800";
    if (functionName.includes("design")) return "bg-green-100 text-green-800";
    if (functionName.includes("engineering")) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800"; // Default color
  };

  // Get task count
  const getTaskCount = () => {
    if (result.type.toLowerCase() === 'job') {
      return `${taskCounts.completed} tasks done`;
    }
    return null;
  };

  // Get result type badge color
  const getTypeBadgeColor = () => {
    const type = result.type.toLowerCase();
    if (type === 'job') return "bg-blue-100 text-blue-800";
    if (type === 'task') return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800"; // Default color
  };

  return (
    <div 
      style={{ width: '100%', minHeight: '120px' }}
      className={`bg-[#F4F4F4] border rounded-md shadow-sm ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onOpenTasksSidebar(result)}
    >
      <div className="p-4 cursor-pointer">
        {/* Top section with checkbox, type badge, and index */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {onSelect && (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(value) => onSelect(result.id, !!value)}
                  aria-label="Select item"
                />
              </div>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeBadgeColor()}`}>
              {result.type || "No type"}
            </span>
            {result.businessFunctionName && (
              <span className={`px-2 py-1 text-xs font-medium rounded ${getFunctionColor()}`}>
                {result.businessFunctionName}
              </span>
            )}
          </div>
          <span className="text-sm font-medium">
            #{index + 1}
          </span>
        </div>
        
        {/* Result title */}
        <div className="mb-6 pl-6">
          <h3 className="text-base font-semibold">{result.title}</h3>
        </div>
        
        {/* Notes preview */}
        <div className="mb-6 pl-6">
          <p className="text-sm text-gray-500 line-clamp-2">{result.notes}</p>
        </div>
        
        {/* Bottom section with additional info */}
        <div className="flex items-center justify-between pl-6">
          <div className="space-y-1">
            {getTaskCount() && <p className="text-sm text-gray-500">{getTaskCount()}</p>}
            {result.dueDate && <p className="text-sm text-gray-500">Due date: {formatDate(result.dueDate)}</p>}
            {result.author && <p className="text-sm text-gray-500">By: {result.author}</p>}
          </div>
        </div>
      </div>
      
      {/* No action buttons */}
    </div>
  );
}