import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TasksButton } from "@/components/tasks/tasks-button";

export type Job = {
  id: string;
  jobNumber: number;
  title: string;
  notes?: string;
  businessFunctionId?: string;
  businessFunctionName?: string;
  dueDate?: string;
  createdDate: string;
  isDone: boolean;
  nextTaskId?: string;  // Added field to track the next task
  tasks?: string[];     // Added field to store task IDs
  // Owner field removed as it's now derived from next task
  impact?: number;
};

export const columns = (
  onEdit: (job: Job) => void,
  onDelete: (id: string) => void,
  onSelect: (jobId: string, checked: boolean) => void,
  onOpenTasksSidebar: (job: Job) => void,
  taskOwnerMap?: Record<string, string> // Map of task ID to owner name
): ColumnDef<Job>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(!!value);
          onSelect(row.original.id, !!value);
        }}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "jobNumber",
    header: "Job No.",
    cell: ({ row }) => {
      const jobNumber = row.getValue("jobNumber") as number;
      return (
        <span className="font-mono text-sm text-gray-600">
          #{jobNumber}
        </span>
      );
    },
    enableSorting: true,
    size: 60,
  },
  {
    accessorKey: "title",
    header: "Title",
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
    id: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const job = row.original;
      const nextTaskId = job.nextTaskId;
      
      // If we have both a next task ID and a task owner mapping
      if (nextTaskId && taskOwnerMap && taskOwnerMap[nextTaskId]) {
        return taskOwnerMap[nextTaskId];
      }
      
      return "Not assigned";
    },
  },
  {
    accessorKey: "businessFunctionName",
    header: "Business Function",
    cell: ({ row }) => {
      const businessFunctionName = row.getValue("businessFunctionName") as
        | string
        | undefined;
      return businessFunctionName || "Not specified";
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as string | undefined;
      if (!dueDate) return "No due date";
  
      // Parse the date and preserve the UTC date
      const date = new Date(dueDate);
      
      // Use toISOString to get YYYY-MM-DD in UTC, then create a new date with just that part
      const utcDateString = date.toISOString().split('T')[0];
      const displayDate = new Date(utcDateString + 'T00:00:00');
  
      return displayDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
  },
  {
    accessorKey: "createdDate",
    header: "Created",
    enableSorting: true,
    cell: ({ row }) => {
      const createdDate = row.getValue("createdDate") as string;
      const date = new Date(createdDate);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.getValue("createdDate") as string;
      const dateB = rowB.getValue("createdDate") as string;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    },
  },
  {
    accessorKey: "impact",
    header: "Impact",
    cell: ({ row }) => {
      const value = row.getValue("impact") as number | undefined;
      return value !== undefined ? value.toString() : "N/A";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const job = row.original;

      return (
        <div className="flex items-center gap-2">
          <TasksButton job={job} onOpenTasksSidebar={onOpenTasksSidebar} />
          <Button variant="ghost" size="icon" onClick={() => onEdit(job)}>
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
                  job "{job.title}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(job.id)}>
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