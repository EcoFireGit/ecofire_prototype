"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PIQBOMappingDialog, MappingFormData } from "@/components/pi-qbo-mapping/pi-qbo-mapping-dialog";
import { columns, MappingTableData, convertMappingsToTableData } from "@/components/pi-qbo-mapping/table/columns";
import { PIQBOMappingTable } from "@/components/pi-qbo-mapping/table/pi-qbo-mapping-table";
import { useToast } from "@/hooks/use-toast";
import { PIQBOMapping } from "@/lib/models/pi-qbo-mapping.model";
import { PIs } from "@/lib/models/pi.model";
import { QBOs } from "@/lib/models/qbo.model";
import { useUser } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PIQBOMappingsPage() {
  const [mappings, setMappings] = useState<PIQBOMapping[]>([]);
  const [pisList, setPisList] = useState<PIs[]>([]);
  const [qbosList, setQbosList] = useState<QBOs[]>([]);
  const [tableData, setTableData] = useState<MappingTableData[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedMapping, setSelectedMapping] = useState<PIQBOMapping | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [piSearchTerm, setPiSearchTerm] = useState("");
  const [qboSearchTerm, setQboSearchTerm] = useState("");
  
  const { toast } = useToast();
  const { user, isLoaded } = useUser();

  const fetchData = async () => {
    if (!isLoaded || !user) return;
    
    setLoading(true);
    try {
      // Fetch data from API endpoints
      const [pisResponse, qbosResponse, mappingsResponse] = await Promise.all([
        fetch('/api/pis'),
        fetch('/api/qbos'),
        fetch('/api/pi-qbo-mappings')
      ]);
      
      if (!pisResponse.ok || !qbosResponse.ok || !mappingsResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const pisData = await pisResponse.json();
      const qbosData = await qbosResponse.json();
      const mappingsData = await mappingsResponse.json();
      
      setPisList(pisData.data || []);
      setQbosList(qbosData.data || []);
      setMappings(mappingsData.data || []);
      
      // Convert to table data
      setTableData(convertMappingsToTableData(
        mappingsData.data || [], 
        pisData.data || [], 
        qbosData.data || []
      ));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user]);

  const handleCreateMapping = () => {
    setDialogMode('create');
    setSelectedMapping(undefined);
    setDialogOpen(true);
  };

  const handleEditMapping = (mappingData: MappingTableData) => {
    const mapping = mappings.find(m => m._id === mappingData.id);
    if (mapping) {
      setSelectedMapping(mapping);
      setDialogMode('edit');
      setDialogOpen(true);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const response = await fetch(`/api/pi-qbo-mappings/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete mapping');
      }
      
      toast({
        title: "Success",
        description: "Mapping deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: "Error",
        description: "Failed to delete mapping",
        variant: "destructive",
      });
    }
  };

  const handleSubmitMapping = async (formData: MappingFormData) => {
    try {
      if (dialogMode === 'create') {
        const response = await fetch('/api/pi-qbo-mappings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create mapping');
        }
        
        toast({
          title: "Success",
          description: "Mapping created successfully",
        });
      } else {
        if (formData.id) {
          const response = await fetch(`/api/pi-qbo-mappings/${formData.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update mapping');
          }
          
          toast({
            title: "Success",
            description: "Mapping updated successfully",
          });
        }
      }
      fetchData();
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save mapping",
        variant: "destructive",
      });
    }
  };

  const filteredTableData = tableData.filter((item) => {
    const matchesPI = piSearchTerm === "" || 
      item.piName.toLowerCase().includes(piSearchTerm.toLowerCase());
    const matchesQBO = qboSearchTerm === "" || 
      item.qboName.toLowerCase().includes(qboSearchTerm.toLowerCase());
    return matchesPI && matchesQBO;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Output-Outcome Mappings</h1>
        <Button onClick={handleCreateMapping} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Map Output to Qutcome
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="pi-search" className="text-sm font-medium mb-2 block">
                Search by Output name
              </Label>
              <Input
                placeholder="Search by Output name..."
                value={piSearchTerm}
                onChange={(e) => setPiSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="qbo-search" className="text-sm font-medium mb-2 block">
                Search by Outcome name
              </Label>
              <Input
                placeholder="Search by Outcome name..."
                value={qboSearchTerm}
                onChange={(e) => setQboSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>

          <PIQBOMappingTable
            columns={columns(handleEditMapping, handleDeleteMapping)}
            data={filteredTableData} 
          />
        </>
      )}

      <PIQBOMappingDialog
        mode={dialogMode}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitMapping}
        initialData={selectedMapping}
        pisList={pisList}
        qbosList={qbosList}
      />
    </div>
  );
}