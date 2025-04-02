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

  import { GCalAuth } from "@/lib/models/gcal-auth.model";

export type Gcal = {
  id: string;
  etag: string;
  summary: string;
  timeZone: string;
};
export function convertGcalsToTableData(GCalAuth: Gcal[]): Gcal[] {
  return GCalAuth.map(Gcal => ({
    id: Gcal.id,
    etag: Gcal.etag,
    summary: Gcal.summary,
    timeZone: Gcal.timeZone,
   
  }));
}


export const columns = (
  
  onSelect: (gcalId: string, checked: boolean) => void
 
): ColumnDef<Gcal>[] => [
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
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "etag",
    header: "Etag",
  },
  {
    accessorKey: "summary",
    header: "Summary",
  },
  {
    accessorKey: "timeZone",
    header: "Timezone",
  },


 
  {
    id: "actions",
    cell: ({ row }) => {
      const gcal = row.original;

      return (
        <div className="flex items-center gap-2">
         
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            
          </AlertDialog>
        </div>
      );
    },
  },
];
