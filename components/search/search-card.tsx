"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    date?: string; // For tasks (do date)
  };
  index: number;
  onOpenTasksSidebar: (result: any) => void;
  onEdit?: (result: any) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  taskOwnerMap?: Record<string, string>;
}

export function SearchResultCard({
  result,
  index,
  onOpenTasksSidebar,
  onEdit,
  onDelete,
  isSelected = false,
  taskOwnerMap
}: SearchResultCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
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

  // Get result type badge color
  const getTypeBadgeColor = () => {
    const type = result.type.toLowerCase();
    if (type === 'job') return "bg-blue-100 text-blue-800";
    if (type === 'task') return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800"; // Default color
  };

  return (
    <div 
      style={{ width: '70%', minHeight: '120px' }}
      className={`bg-[#F4F4F4] border rounded-md shadow-sm ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onOpenTasksSidebar(result)}
    >
      <div className="p-4 cursor-pointer">
        {/* Top section with checkbox, type badge, and index */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
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
        <div className="mb-3 pl-6">
          <h3 className="text-base font-semibold">{result.title}</h3>
        </div>
        
        {/* Notes preview with line clamp for 3 lines */}
        <div className="mb-3 pl-6">
          <p className="text-sm text-gray-500 overflow-hidden line-clamp-3">
            {result.notes}
          </p>
        </div>
        
        {/* Bottom section with additional info */}
        <div className="flex items-center justify-between pl-6">
          <div className="space-y-1">
            {/* Show due date for jobs */}
            {result.type.toLowerCase() === 'job' && result.dueDate && (
              <p className="text-sm text-gray-500">Due date: {formatDate(result.dueDate)}</p>
            )}
            {/* Show do date for tasks */}
            {result.type.toLowerCase() === 'task' && result.date && (
              <p className="text-sm text-gray-500">Do date: {formatDate(result.date)}</p>
            )}
            {result.author && <p className="text-sm text-gray-500">By: {result.author}</p>}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end p-2 border-t" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(result);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  {result.type} "{result.title}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(result.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}