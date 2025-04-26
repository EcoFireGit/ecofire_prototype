"use client";
import { useEffect, useState } from "react";
import { BusinessFunction, columns } from "@/components/business-functions/table/columns";
import { DataTable } from "@/components/business-functions/table/business-functions-table";
import { CreateDialog } from "@/components/business-functions/create-dialog";
import { EditDialog } from "@/components/business-functions/edit-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function convertToTableData(data: any[]): BusinessFunction[] {
  return data.map(item => ({
    id: item._id,
    name: item.name,
    isDefault: item.isDefault,
    jobCount: item.jobCount || 0
  }));
}

export default function BusinessFunctionsPage() {
  const [data, setData] = useState<BusinessFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<{id: string, name: string}>({id: '', name: ''});
  const { toast } = useToast();

  const fetchBusinessFunctions = async () => {
    try {
      const response = await fetch('/api/business-functions');
      const result = await response.json();
     
      if (result.success) {
        const tableData = convertToTableData(result.data);
        setData(tableData);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch business functions');
      console.error('Error fetching business functions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessFunctions();
  }, []);

  const handleCreate = async (name: string) => {
    try {
      const response = await fetch('/api/business-functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Business function created successfully",
        });
        fetchBusinessFunctions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create business function",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/business-functions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Business function updated successfully",
        });
        fetchBusinessFunctions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update business function",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/business-functions/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Business function deleted successfully",
        });
        fetchBusinessFunctions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete business function",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (id: string, name: string) => {
    setCurrentFunction({id, name});
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-lg">Loading business functions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center gap-10 mb-6">
          <h1 className="text-2xl font-bold">Business Functions</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Business Function
          </Button>
        </div>
       
        <DataTable
          columns={columns(handleDelete, openEditDialog)}
          data={data}
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
          initialId={currentFunction.id}
          initialName={currentFunction.name}
        />
      </div>
    </div>
  );
}