"use client";

import { useEffect, useState } from "react";
import { PI, columns, convertPIsToTableData } from "@/components/PIS/table/columns";
import { PISTable } from "@/components/PIS/table/PI-table";
import { PIDialog } from "@/components/PIS/PI-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PIsPage() {
  const [data, setData] = useState<PI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPI, setEditingPI] = useState<PI | undefined>(undefined);
  const { toast } = useToast();

  const fetchPIs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/PIS');
      const result = await response.json();
      
      if (result.success) {
        const tableData = convertPIsToTableData(result.data);
        setData(tableData);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch PIs');
      console.error('Error fetching PIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPIs();
  }, []);

  const handleCreate = async (PIData: Partial<PI>) => {
    try {
      const response = await fetch('/api/PIS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(PIData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "PI created successfully",
        });
        fetchPIs();
        setDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create PI",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (PIData: Partial<PI>) => {
    if (!editingPI) return;

    try {
      const response = await fetch(`/api/PIS/${editingPI.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(PIData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "PI updated successfully",
        });
        fetchPIs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update PI",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/PIS/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "PI deleted successfully",
        });
        fetchPIs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete PI",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (PIs: PI) => {
    setEditingPI(PIs);
    
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPI(undefined);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading PIs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">PIs</h1>
          <Button onClick={handleOpenCreate} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="mr-2 h-4 w-4" /> Add PI
          </Button>
        </div>
        
        <PISTable 
          columns={columns(handleOpenEdit, handleDelete)} 
          data={data} 
        />

        <PIDialog
          mode={editingPI ? 'edit' : 'create'}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={editingPI ? handleEdit : handleCreate}
          initialData={editingPI}
        />
      </div>
    </div>
  );
}