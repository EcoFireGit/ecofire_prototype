"use client";

import { useEffect, useState } from "react";
import { MappingJP, columns, convertJPMappingToTableData } from "@/components/pi-job-mapping/table/columns";
import { MappingJPTable } from "@/components/pi-job-mapping/table/pi-job-mapping-table";
import { MappingDialog } from "@/components/pi-job-mapping/pi-job-mapping-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PiJobMappingPage() {
  const [data, setData] = useState<MappingJP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPI, setEditingPI] = useState<MappingJP | undefined>(undefined);
  const [pisList, setPisList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [piSearchTerm, setPiSearchTerm] = useState("");
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  
  const { toast } = useToast();
  const { user, isLoaded } = useUser();

  const fetchData = async () => {
    if (!isLoaded || !user) return;
    
    try {
      setLoading(true);
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
      const mappingsResult = await mappingsResponse.json();
      
      // Filter out deleted jobs and completed jobs
      const filteredJobs = jobsData.data.filter((job: any) => 
        // Keep job if isDeleted is false or doesn't exist AND isDone is false
        (job.isDeleted === false || job.isDeleted === undefined) && 
        job.isDone === false
      );
      
      setPisList(pisData.data || []);
      setJobsList(filteredJobs || []);
      
      if (mappingsResult.success) {
        // Only convert mappings that reference non-deleted and active jobs
        const activeJobIds = new Set(filteredJobs.map((job: any) => job._id));
        const filteredMappings = mappingsResult.data.filter((mapping: any) => 
          // Only include mappings where the jobId is in our filtered job list
          activeJobIds.has(mapping.jobId)
        );
        
        const tableData = convertJPMappingToTableData(filteredMappings, pisData.data, filteredJobs);
        setData(tableData);
      } else {
        setError(mappingsResult.error);
      }
    } catch (err) {
      setError('Failed to fetch Mapping');
      console.error('Error fetching Mapping:', err);
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
        fetchData();
        setDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create Mapping",
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
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update Mapping",
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
        fetchData();
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
        <div className="text-lg">Loading Mapping between Jobs and Output...</div>
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

  const filteredData = data.filter((item) => {
    const matchesPI = piSearchTerm === "" || 
      item.piName.toLowerCase().includes(piSearchTerm.toLowerCase());
    const matchesJob = jobSearchTerm === "" || 
      item.jobName.toLowerCase().includes(jobSearchTerm.toLowerCase());
    return matchesPI && matchesJob;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mapping Job and Output</h1>
        <Button onClick={handleOpenCreate} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>
      </div>
      <div className="flex gap-4 mb-4"> 
        <div className="flex-1">
          <Label htmlFor="job-search" className="text-sm font-medium mb-2 block">
            Search by Job name
          </Label>
          <Input
            placeholder="Search by Job name..."
            value={jobSearchTerm}
            onChange={(e) => setJobSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
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
      </div>
      <MappingJPTable 
        columns={columns(handleOpenEdit, handleDelete)} 
        data={filteredData} 
      />

      <MappingDialog
        mode={editingPI ? 'edit' : 'create'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingPI ? handleEdit : handleCreate}
        initialData={editingPI}
        pisList={pisList}
        jobsList={jobsList}
      />
    </div>
  );
}