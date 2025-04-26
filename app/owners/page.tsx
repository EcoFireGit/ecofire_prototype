"use client";

import { useState, useEffect } from "react";
import { OwnersTable } from "@/components/owners/table/owners-table";
import { Owner, columns } from "@/components/owners/table/columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateDialog } from "@/components/owners/create-dialog";
import { EditDialog } from "@/components/owners/edit-dialog";

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentOwner, setCurrentOwner] = useState<{id: string, name: string}>({id: '', name: ''});
  const { toast } = useToast();

  const convertOwnersToTableData = (ownersData: any[]): Owner[] => {
    return ownersData.map(owner => ({
      id: owner._id, // Ensure we have an id field
      name: owner.name
    }));
  };

  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners');
      const result = await response.json();
      
      if (response.ok) {
        setOwners(convertOwnersToTableData(result));
      } else {
        setError(result.error || 'Failed to fetch owners');
      }
    } catch (err) {
      setError('Failed to fetch owners');
      console.error('Error fetching owners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleCreate = async (name: string) => {
    try {
      const response = await fetch('/api/owners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Owner created successfully',
        });
        fetchOwners();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create owner',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error('Error creating owner:', err);
    }
  };

  const handleEdit = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Owner updated successfully',
        });
        fetchOwners();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update owner',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error('Error updating owner:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Owner deleted successfully',
        });
        fetchOwners();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete owner',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error('Error deleting owner:', err);
    }
  };

  const openEditDialog = (id: string, name: string) => {
    setCurrentOwner({ id, name });
    setEditDialogOpen(true);
  };

  if (loading) {
    return <div className="p-4">Loading owners...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center gap-10 mb-6">
          <h1 className="text-2xl font-bold">Owners</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Owner
          </Button>
        </div>
       
        <OwnersTable
          columns={columns(handleDelete, openEditDialog)}
          data={owners}
        />

        <CreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreate}
        />

        <EditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEdit}
          initialId={currentOwner.id}
          initialName={currentOwner.name}
        />
      </div>
    </div>
  );
}
