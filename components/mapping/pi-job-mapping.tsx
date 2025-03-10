"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PIJobMappingDialog, MappingFormData } from "@/components/pi-job-mapping/pi-job-mapping-dialog";
import { columns, MappingTableData, convertMappingsToTableData } from "@/components/pi-job-mapping/table/columns";
import { PIJobMappingTable } from "@/components/pi-job-mapping/table/pi-job-mapping-table";
import { useToast } from "@/hooks/use-toast";
import { JobPiMapping } from "@/lib/models/pi-job-mapping.model";
import { PIs } from "@/lib/models/pi.model";
import { Jobs } from "@/lib/models/job.model";
import { useUser } from "@clerk/nextjs";
import { Plus } from "lucide-react";

export default function PIJobMappingsPage() {
  const [mappings, setMappings] = useState<JobPiMapping[]>([]);
  const [pisList, setPisList] = useState<PIs[]>([]);
  const [jobsList, setJobsList] = useState<Jobs[]>([]);
  const [tableData, setTableData] = useState<MappingTableData[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedMapping, setSelectedMapping] = useState<JobPiMapping | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();
  const { user, isLoaded } = useUser();

  const fetchData = async () => {
    if (!isLoaded || !user) return;
    
    setLoading(true);
    try {
      // Fetch data from API endpoints
      const [pisResponse, jobsResponse, mappingsResponse] = await Promise.all([
        fetch('/api/pis'),
        fetch('/api/jobs'),
        fetch('/api/pi-job-mappings')
      ]);
      
      if (!pisResponse.ok || !jobsResponse.ok || !mappingsResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const pisData = await pisResponse.json();
      const jobsData = await jobsResponse.json();
      const mappingsData = await mappingsResponse.json();
      
      setPisList(pisData.data || []);
      setJobsList(jobsData.data || []);
      setMappings(mappingsData.data || []);
      
      // Convert to table data
      setTableData(convertMappingsToTableData(
        mappingsData.data || [], 
        pisData.data || [], 
        jobsData.data || []
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
      const response = await fetch(`/api/pi-job-mappings/${id}`, {
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
        const response = await fetch('/api/pi-job-mappings', {
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
          const response = await fetch(`/api/pi-job-mappings/${formData.id}`, {
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PI-Job Mappings</h1>
        <Button onClick={handleCreateMapping} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Map PI to Job
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading...</p>
        </div>
      ) : (
        <PIJobMappingTable
          columns={columns(handleEditMapping, handleDeleteMapping)}
          data={tableData}
        />
      )}

      <PIJobMappingDialog
        mode={dialogMode}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitMapping}
        initialData={selectedMapping}
        pisList={pisList}
        jobsList={jobsList}
      />
    </div>
  );
}