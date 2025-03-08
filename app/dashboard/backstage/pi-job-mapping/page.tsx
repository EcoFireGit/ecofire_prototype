"use client";

import { useEffect, useState } from "react";
import { MappingJP, columns, convertJPMappingToTableData } from "@/components/pi-job-mapping/table/columns";
import { MappingJPTable } from "@/components/pi-job-mapping/table/pi-job-mapping-table";
import { MappingDialog } from "@/components/pi-job-mapping/pi-job-mapping-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PIsPage() {
  const [data, setData] = useState<MappingJP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPI, setEditingPI] = useState<MappingJP | undefined>(undefined);
  const { toast } = useToast();

  const fetchPIs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pi-job-mappings');
      const result = await response.json();
      
      if (result.success) {
        const tableData = convertJPMappingToTableData(result.data);
        setData(tableData);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch Mapping');
      console.error('Error fetching Mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPIs();
  }, []);

  const handleCreate = async (PIData: Partial<MappingJP>) => {
    try {
      const response = await fetch('/api/pi-job-mappings', {
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
          description: "Mapping created successfully",
        });
        fetchPIs();
        setDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create Mapping",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (MappingData: Partial<MappingJP>) => {
    if (!editingPI) return;

    try {
      const response = await fetch(`/api/pi-job-mappings/${editingPI.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(MappingData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Mapping updated successfully",
        });
        fetchPIs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update Mapping",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/pi-job-mappings/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Mapping deleted successfully",
        });
        fetchPIs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete Mapping",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (MJP: MappingJP) => {
    setEditingPI(MJP);
    
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPI(undefined);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Mapping between Jobs and PI...</div>
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
          <h1 className="text-2xl font-bold">Mapping Job and PI</h1>
          <Button onClick={handleOpenCreate} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="mr-2 h-4 w-4"/>Add Mapping
          </Button>
        </div>
        
        <MappingJPTable 
          columns={columns(handleOpenEdit, handleDelete)} 
          data={data} 
        />

        <MappingDialog
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