// components/organizations/table/organizations-table.tsx
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useView } from "@/lib/contexts/view-context";
import { Edit, Trash, Users } from "lucide-react";
import { OrganizationDialog } from "@/components/organizations/organization-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Organization {
  _id: string;
  name: string;
  description?: string;
}

interface OrganizationsTableProps {
  organizations: Organization[];
}

export function OrganizationsTable({ organizations }: OrganizationsTableProps) {
  const { setOrganizationView } = useView();
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (org: Organization) => {
    setOrgToDelete(org);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!orgToDelete) return;

    try {
      const response = await fetch(`/api/organizations/${orgToDelete._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the page to update the list
        window.location.reload();
      } else {
        console.error("Error deleting organization:", data.error);
      }
    } catch (error) {
      console.error("Error deleting organization:", error);
    }
  };

  const switchToOrg = async (orgId: string) => {
    const success = await setOrganizationView(orgId);
    if (success) {
      // Redirect to dashboard or show notification
      window.location.href = "/dashboard";
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                No organizations found. Create your first organization to get
                started.
              </TableCell>
            </TableRow>
          ) : (
            organizations.map((org) => (
              <TableRow key={org._id}>
                <TableCell
                  className="font-medium cursor-pointer hover:text-blue-600"
                  onClick={() => switchToOrg(org._id)}
                >
                  {org.name}
                </TableCell>
                <TableCell>{org.description || "No description"}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(org)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(org)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    }
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() =>
                        (window.location.href = `/dashboard/organizations/${org._id}/members`)
                      }
                    >
                      <Users className="h-4 w-4" /> Add members
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      {editingOrg && (
        <OrganizationDialog
          mode="edit"
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          initialData={editingOrg}
          onSubmit={() => {
            // Refresh the organization list
            window.location.reload();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the organization
                {orgToDelete?.name && (
                  <strong> "{orgToDelete.name}"</strong>
                )}{" "}
                and all of its data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    </div>
  );
}

