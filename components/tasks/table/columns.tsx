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
import { Task, FocusLevel, JoyLevel } from "../types";
import { Badge } from "@/components/ui/badge";

export const columns = (
  onEdit: (task: Task) => void,
  onDelete: (id: string) => void,
  onComplete: (id: string, jobid:string, completed: boolean) => void,
  ownerMap: Record<string, string> = {}
): ColumnDef<Task>[] => [
  {
    id: "completed",
    header: "Done",
    cell: ({ row }) => {
      const task = row.original;
      return (
        <Checkbox
          checked={task.completed}
          onCheckedChange={(value) => onComplete(task.id, task.jobId, !!value)}
          aria-label="Mark as completed"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      const isCompleted = row.original.completed;
      
      // No need for additional styling here as the parent container will handle it
      return title;
    }
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const ownerId = row.getValue("owner") as string | undefined;
      
      if (!ownerId) return "Not assigned";
      
      // Look up the owner name from the ownerMap
      const ownerName = ownerMap[ownerId];
      
      // If the owner doesn't exist in our map (possibly deleted)
      // return "Not assigned" - same as if no owner was set
      return ownerName || "Not assigned"; 
    },
  },
  {
    accessorKey: "date",
    header: "Do Date",
    cell: ({ row }) => {
      const date = row.getValue("date") as string | undefined;
      if (!date) return "No date";

      const displayDate = new Date(date);
      return displayDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
  },
  {
    accessorKey: "requiredHours",
    header: "Hours Required",
    cell: ({ row }) => {
      const hours = row.getValue("requiredHours") as number | undefined;
      return hours !== undefined ? `${hours}h` : "N/A";
    },
  },
  {
    accessorKey: "focusLevel",
    header: "Focus",
    cell: ({ row }) => {
      const focusLevel = row.getValue("focusLevel") as FocusLevel | undefined;
      
      if (!focusLevel) return "N/A";
      
      const colors = {
        [FocusLevel.High]: "bg-red-100 text-red-800",
        [FocusLevel.Medium]: "bg-orange-100 text-orange-800",
        [FocusLevel.Low]: "bg-green-100 text-green-800",
      };

      return (
        <Badge className={colors[focusLevel]}>
          {focusLevel}
        </Badge>
      );
    },
  },
  {
    accessorKey: "joyLevel",
    header: "Joy",
    cell: ({ row }) => {
      const joyLevel = row.getValue("joyLevel") as JoyLevel | undefined;
      
      if (!joyLevel) return "N/A";
      
      const colors = {
        [JoyLevel.High]: "bg-green-100 text-green-800",
        [JoyLevel.Medium]: "bg-blue-100 text-blue-800",
        [JoyLevel.Low]: "bg-purple-100 text-purple-800",
      };

      return (
        <Badge className={colors[joyLevel]}>
          {joyLevel}
        </Badge>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | undefined;
      if (!notes) return "No notes";
      
      return (
        <div className="max-h-[160px] min-h-[60px] w-[300px] overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm break-words whitespace-normal">
          {notes}
        </div>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.getValue("tags") as string[] | undefined;
      
      if (!tags || tags.length === 0) return "No tags";
      
      // Function to generate a consistent color for a tag
      const getTagColor = (tag: string) => {
        // Generate a hash code from the tag string
        const hashCode = tag.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        // Map to HSL color space for better distribution of colors
        // Use higher saturation and limited lightness range for better readability
        const h = Math.abs(hashCode % 360);
        const s = 65 + (hashCode % 20); // 65-85% saturation
        const l = 55 + (hashCode % 15); // 55-70% lightness - not too dark, not too light
        
        return `hsl(${h}, ${s}%, ${l}%)`;
      };
      
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white shadow-sm"
              style={{ 
                backgroundColor: getTagColor(tag),
                whiteSpace: 'nowrap'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original;

      return (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
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
                  task "{task.title}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(task.id)}>
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