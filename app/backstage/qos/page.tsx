"use client";

import { useEffect, useState } from "react";
import { QBO, columns, convertQBOsToTableData } from "@/components/qbos/table/columns";
import { QBOTable } from "@/components/qbos/table/qbo-table";
import { QBODialog } from "@/components/qbos/qbo-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QBOsPage() {
  const [data, setData] = useState<QBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQBO, setEditingQBO] = useState<QBO | undefined>(undefined);
  const { toast } = useToast();

  const fetchQBOs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qbos');
      const result = await response.json();
      
      if (result.success) {
        const tableData = convertQBOsToTableData(result.data);
        setData(tableData);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch QBOs');
      console.error('Error fetching QBOs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQBOs();
  }, []);

  const handleCreate = async (qboData: Partial<QBO>) => {
    try {
      const response = await fetch('/api/qbos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qboData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Outcome created successfully",
        });
        fetchQBOs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create Outcome",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (qboData: Partial<QBO>) => {
    if (!editingQBO) return;

    try {
      const response = await fetch(`/api/qbos/${editingQBO.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qboData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Outcome updated successfully",
        });
        fetchQBOs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update Outcome",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/qbos/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Outcome deleted successfully",
        });
        fetchQBOs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete Outcome",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (qbo: QBO) => {
    setEditingQBO(qbo);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingQBO(undefined);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Outcomes...</div>
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
          <h1 className="text-2xl font-bold">Outcomes</h1>
          <Button onClick={handleOpenCreate} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="mr-2 h-4 w-4" /> Add Outcome
          </Button>
        </div>
        
        <QBOTable 
          columns={columns(handleOpenEdit, handleDelete)} 
          data={data} 
        />

        <QBODialog
          mode={editingQBO ? 'edit' : 'create'}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={editingQBO ? handleEdit : handleCreate}
          initialData={editingQBO}
        />
      </div>
    </div>
  );
}