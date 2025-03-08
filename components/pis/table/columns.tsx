// components/PIS/table/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Import the database model type
import { PIs } from "@/lib/models/pi.model";

// Table-specific type that converts from the database model
export type PI = {
  id: string
  name: string;
  unit: string;
  beginningValue: number;
  targetValue: number;
  deadline: string;
  notes?: string;
 
};

// Function to convert from database model to table data
export function convertPIsToTableData(PIS: PIs[]): PI[] {
  return PIS.map(PIs => ({
    id: PIs._id,
    name: PIs.name,
    unit: PIs.unit || '',
    beginningValue: PIs.beginningValue || 0,
    targetValue: PIs.targetValue || 0,
    //points: PI.points || 0,
    deadline: PIs.deadline ? 
    // Handle both string and Date objects
    (typeof PIs.deadline === 'string' ? PIs.deadline : PIs.deadline.toISOString()) 
    : '',
    notes: PIs.notes || ''
   
  }));
}

export const columns = (
  onEdit: (PI: PI) => void,
  onDelete: (id: string) => void
): ColumnDef<PI>[] => [
  {
    accessorKey: "name",
    header: "PI name",
  },
  {
    accessorKey: "unit",
    header: "PI Unit",
  },
  {
    accessorKey: "beginningValue",
    header: "Beginning value",
    cell: ({ row }) => {
      const value = row.getValue("beginningValue") as number;
      return value.toString();
    }
  },
  {
    accessorKey: "targetValue",
    header: "Target value",
    cell: ({ row }) => {
      const value = row.getValue("targetValue") as number;
      return value.toString();
    }
  },
  {
    accessorKey: "deadline",
    header: "Deadline",
    cell: ({ row }) => {
      const deadline = row.getValue("deadline") as string;
      if (!deadline) return "No deadline";
      
      // Parse the date and format it in MM/DD/YYYY format
      // Using noon UTC time to avoid timezone shifting issues
      const date = new Date(deadline);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC' // Important: ensure date is interpreted in UTC
      });
    }
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | undefined;
      return notes || "";
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const PI = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(PI)}
          >
            <Edit className="h-4 w-4" />
          </Button>
         
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the PI
                  "{PI.name}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(PI.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }
  }
];