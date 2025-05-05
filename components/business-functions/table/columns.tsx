import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

export type BusinessFunction = {
  id: string;
  name: string;
  isDefault?: boolean;
  jobCount?: number;
}

export const columns = (
  onDelete: (id: string) => void,
  onEdit: (id: string, name: string) => void
): ColumnDef<BusinessFunction>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const isDefault = row.original.isDefault;
      return (
        <div className="flex items-center gap-2">
          {row.getValue("name")}
          {/* {isDefault && (
            <Badge variant="secondary">Default</Badge>
          )} 
           
          removed the default badge from the table
           */}

        </div>
      );
    }
  },
  {
    accessorKey: "jobCount",
    header: "Associated Jobs",
    cell: ({ row }) => {
      const count = row.original.jobCount || 0;
      return (
        <div>
          <Badge variant="outline">{count}</Badge>
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const businessFunction = row.original;
      
      return (
        <div className="flex gap-2 justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(businessFunction.id, businessFunction.name)}
          >
            <Pencil className="h-4 w-4" />
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
                  This will permanently delete the business function
                  "{businessFunction.name}".
                  {businessFunction.isDefault && " This is a default business function."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(businessFunction.id)}
                >
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