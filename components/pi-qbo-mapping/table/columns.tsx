// components/pi-qbo-mapping/table/columns.tsx
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
import { PIQBOMapping } from "@/lib/models/pi-qbo-mapping.model";
import { PIs } from "@/lib/models/pi.model";
import { QBOs } from "@/lib/models/qbo.model";

// Table-specific type that converts from the database model
export type MappingTableData = {
  id: string;
  piId: string;
  piName: string;
  qboId: string;
  qboName: string;
  piTarget: number;
  qboTarget: number;
  qboImpact: number;
  notes?: string;
};

// Function to convert from database models to table data
export function convertMappingsToTableData(
  mappings: PIQBOMapping[], 
  pisList: PIs[], 
  qbosList: QBOs[]
): MappingTableData[] {
  return mappings.map(mapping => {
    const pi = pisList.find(pi => pi._id === mapping.piId);
    const qbo = qbosList.find(qbo => qbo._id === mapping.qboId);
    
    return {
      id: mapping._id,
      piId: mapping.piId,
      piName: pi?.name || 'Unknown PI',
      qboId: mapping.qboId,
      qboName: qbo?.name || 'Unknown QBO',
      piTarget: mapping.piTarget,
      qboTarget: mapping.qboTarget,
      qboImpact: mapping.qboImpact,
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
    header: "Output Name",
  },
  {
    accessorKey: "piTarget",
    header: "Output Target",
    cell: ({ row }) => {
      const value = row.getValue("piTarget") as number;
      return value.toString();
    }
  },
  {
    accessorKey: "qboName",
    header: "Outcome Name",
  },
  {
    accessorKey: "qboTarget",
    header: "Outcome Target",
    cell: ({ row }) => {
      const value = row.getValue("qboTarget") as number;
      return value.toString();
    }
  },
  {
    accessorKey: "qboImpact",
    header: "Outcome Impact",
    cell: ({ row }) => {
      const value = row.getValue("qboImpact") as number;
      return value.toString();
    }
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
                  "{mapping.piName}" and "{mapping.qboName}" and remove it from our servers.
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