// components/pi-job-mapping/table/columns.tsx
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

// Import the database model types
import { JobPiMapping } from "@/lib/models/pi-job-mapping.model";
import { PIs } from "@/lib/models/pi.model";
import { Jobs } from "@/lib/models/job.model";

// Table-specific type that converts from the database model
export type MappingTableData = {
  id: string;
  piId: string;
  piName: string;
  jobId: string;
  jobName: string;
  piTarget: number;
  piImpactValue: number;
  notes?: string;
};

// Function to convert from database models to table data
export function convertMappingsToTableData(
  mappings: JobPiMapping[], 
  pisList: PIs[], 
  jobsList: Jobs[]
): MappingTableData[] {
  return mappings.map(mapping => {
    const pi = pisList.find(pi => pi._id === mapping.piId);
    const job = jobsList.find(job => job._id === mapping.jobId);
    
    return {
      id: mapping._id,
      piId: mapping.piId,
      piName: pi?.name || 'Unknown PI',
      jobId: mapping.jobId,
      jobName: job?.title || 'Unknown Job',
      piTarget: mapping.piTarget,
      piImpactValue: mapping.piImpactValue,
      notes: mapping.notes
    };
  });
}

export const columns = (
  onEdit: (mapping: MappingTableData) => void,
  onDelete: (id: string) => void
): ColumnDef<MappingTableData>[] => [
  {
    accessorKey: "piName",
    header: "PI Name",
  },
  {
    accessorKey: "piTarget",
    header: "PI Target",
    cell: ({ row }) => {
      const value = row.getValue("piTarget") as number;
      return value.toString();
    }
  },
  {
    accessorKey: "jobName",
    header: "Job Title",
  },
  {
    accessorKey: "piImpactValue",
    header: "PI Impact Value",
    cell: ({ row }) => {
      const value = row.getValue("piImpactValue") as number;
      return value.toString();
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
      const mapping = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(mapping)}
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
                  This action cannot be undone. This will permanently delete the mapping between
                  "{mapping.piName}" and "{mapping.jobName}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(mapping.id)}>
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