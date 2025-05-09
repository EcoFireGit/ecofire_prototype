// components/qbos/table/columns.tsx - Date display update
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
import { QBOs } from "@/lib/models/qbo.model";

// Table-specific type that converts from the database model
export type QBO = {
  id: string;
  name: string;
  unit: string;
  beginningValue: number;
  currentValue: number;
  targetValue: number;
  deadline: string;
  points: number;
  notes?: string;
  currentProgress?: number; // Calculated field
  expectedProgress?: number; // Calculated field
};

// Function to convert from database model to table data
export function convertQBOsToTableData(qbos: QBOs[]): QBO[] {
  return qbos.map((qbo) => ({
    id: qbo._id,
    name: qbo.name,
    unit: qbo.unit || "",
    beginningValue: qbo.beginningValue || 0,
    currentValue: qbo.currentValue || 0,
    targetValue: qbo.targetValue || 0,
    deadline: qbo.deadline
      ? // Handle both string and Date objects
        typeof qbo.deadline === "string"
        ? qbo.deadline
        : qbo.deadline.toISOString()
      : "",
    points: qbo.points || 0,
    notes: qbo.notes || "",
  }));
}

export const columns = (
  onEdit: (qbo: QBO) => void,
  onDelete: (id: string) => void,
): ColumnDef<QBO>[] => [
  {
    accessorKey: "name",
    header: "Outcome name",
  },
  {
    accessorKey: "unit",
    header: "Outcome unit",
  },
  {
    accessorKey: "beginningValue",
    header: "Beginning value",
    cell: ({ row }) => {
      const value = row.getValue("beginningValue") as number;
      return value.toString();
    },
  },
  {
    accessorKey: "currentValue",
    header: "Current value",
    cell: ({ row }) => {
      const value = row.getValue("currentValue") as number;
      return value.toString();
    },
  },
  {
    accessorKey: "targetValue",
    header: "Target value",
    cell: ({ row }) => {
      const value = row.getValue("targetValue") as number;
      return value.toString();
    },
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
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC", // Important: ensure date is interpreted in UTC
      });
    },
  },
  {
    accessorKey: "points",
    header: "Outcome importance score",
    cell: ({ row }) => {
      const points = row.getValue("points") as number;
      return points.toString();
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | undefined;
      if (!notes) return "No notes";
      // Truncate long notes and add ellipsis
      return (
        <div className="max-h-[100px] min-h-[60px] w-[300px] overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm break-words whitespace-normal">
          {notes}
        </div>
      );
    },
  },
  {
    accessorKey: "currentProgress",
    header: "Current % Progress",
    cell: ({ row }) => {
      const currentValue = row.getValue("currentValue") as number;
      const beginningValue = row.getValue("beginningValue") as number;
      const targetValue = row.getValue("targetValue") as number;

      // Calculate progress percentage
      let progress = 0;
      if (targetValue !== beginningValue) {
        progress =
          ((currentValue - beginningValue) / (targetValue - beginningValue)) *
          100;
      }

      return `${progress.toFixed(0)}%`;
    },
  },
  {
    accessorKey: "expectedProgress",
    header: "Expected % Progress",
    cell: ({ row }) => {
      // Expected progress calculation would typically involve time elapsed
      // This is a placeholder - qbo progress logic here
      return "0%";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const qbo = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(qbo)}>
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
                  This action cannot be undone. This will permanently delete the
                  QBO "{qbo.name}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(qbo.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];

