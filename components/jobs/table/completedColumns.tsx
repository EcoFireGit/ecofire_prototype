// completedColumns.tsx
import { ColumnDef } from "@tanstack/react-table"
import { Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import { Job } from "./columns"
import { Checkbox } from "@/components/ui/checkbox"
import { TasksButton } from "@/components/tasks/tasks-button"

export const completedColumns = (
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
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | undefined;
      if (!notes) return "No notes";
      return (
        <div className="max-h-[100px] min-h-[60px] w-[300px] overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm break-words whitespace-normal">
          {notes}
        </div>
      );
    }
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
      const businessFunctionName = row.getValue("businessFunctionName") as string | undefined;
      return businessFunctionName || "Not specified";
    }
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as string | undefined;
      if (!dueDate) return "No due date";
     
      return new Date(dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
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
    }
  }
];