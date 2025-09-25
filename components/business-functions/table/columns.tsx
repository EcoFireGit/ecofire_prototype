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

// Add type for jobs
type Job = {
  category: string;
  isDone: boolean;
};

export type BusinessFunction = {
  id: string;
  name: string;
  isDefault?: boolean;
  jobs?: Job[];
}

// Generate a consistent color for a business function
const getBusinessFunctionColor = (name: string) => {
  const hashCode = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const h = Math.abs(hashCode % 360);
  const s = 85;
  const l = 88;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

// All the categories you want to show
const CATEGORIES = ["engineering", "marketing", "design"];

export const columns = (
  onDelete: (id: string) => void,
  onEdit: (id: string, name: string) => void
): ColumnDef<BusinessFunction>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const bgColor = getBusinessFunctionColor(name);
      const textColor = bgColor.replace('88%', '30%');
      return (
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 rounded-md text-sm font-medium"
            style={{
              backgroundColor: bgColor,
              color: textColor
            }}
          >
            {name}
          </span>
        </div>
      );
    }
  },
  // Dynamically add a column per category
  ...CATEGORIES.map(category => ({
    id: `active-jobs-${category}`,
    header: `${category.charAt(0).toUpperCase() + category.slice(1)} Jobs`,
    cell: ({ row }: any) => {
      const jobs = row.original.jobs || [];
      // Count active jobs in this category
      const count = jobs.filter((job: Job) => job.category === category && !job.isDone).length;
      return (
        <div>
          <Badge variant={count > 0 ? "default" : "outline"}>
            {count}
          </Badge>
        </div>
      );
    }
  })),
  {
    id: "actions",
    cell: ({ row }) => {
      const businessFunction = row.original;
      return (
        <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={e => {
              e.stopPropagation();
              onEdit(businessFunction.id, businessFunction.name);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={e => e.stopPropagation()}
              >
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
