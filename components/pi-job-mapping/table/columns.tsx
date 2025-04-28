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
import { JobPiMapping } from "@/lib/models/pi-job-mapping.model";

// Table-specific type that converts from the database model
export type MappingJP = {
  id: string;
  jobId: string;
  jobName: string;
  piName: string;
  piId: string;
  piImpactValue: number;
  piTarget: number; // Added field
  notes?: string;
};

// Function to convert from database model to table data
export function convertJPMappingToTableData(
  JPMap: JobPiMapping[],
): MappingJP[] {
  return JPMap.map((JobPiMapping) => ({
    id: JobPiMapping._id,
    jobId: JobPiMapping.jobId,
    piId: JobPiMapping.piId || "",
    piImpactValue: JobPiMapping.piImpactValue || 0,
    jobName: JobPiMapping.jobName,
    piName: JobPiMapping.piName || "",
    piTarget: JobPiMapping.piTarget || 0, // Added field
    notes: JobPiMapping.notes || "",
  }));
}

export const columns = (
  onEdit: (JP: MappingJP) => void,
  onDelete: (id: string) => void,
): ColumnDef<MappingJP>[] => [
  {
    accessorKey: "jobName",
    header: "Job name",
  },
  {
    accessorKey: "piName",
    header: "Output Name",
  },
  {
    accessorKey: "piTarget",
    header: "Output Target",
    cell: ({ row }) => {
      const value = row.getValue("piTarget") as number;
      return value.toString();
    },
  },
  {
    accessorKey: "piImpactValue",
    header: "Output Impact",
    cell: ({ row }) => {
      const value = row.getValue("piImpactValue") as number;
      return value.toString();
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
    id: "actions",
    cell: ({ row }) => {
      const JP = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(JP)}>
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
                  Mapping between "{JP.jobName}" and "{JP.piName}" and remove it
                  from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(JP.id)}>
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
