// components/pis/pi-dialog.tsx

import { Button } from "@/components/ui/button";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { MappingJP } from "./table/columns";
import { Job } from "@/components/jobs/table/columns";
import { PI } from "@/components/pis/table/columns";



interface MappingDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mapping: Partial<MappingJP>) => void;
  initialData?: MappingJP;
}

export function MappingDialog({ 
  mode, 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData 
}: MappingDialogProps) {
    

 
  
  const [jobs, setJobs] = useState<any[]>([]);
const [pis, setPIs] = useState<any[]>([]);

useEffect(() => {
  async function fetchData() {
    try {
      const jobsResponse = await fetch('/api/jobs');
      const pisResponse = await fetch('/api/pis');
      const jobsData = await jobsResponse.json();
      const pisData = await pisResponse.json();

      console.log('Fetched jobs:', jobsData.data);
      console.log('Fetched PIs:', pisData.data);

      setJobs(jobsData.data);
      setPIs(pisData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  fetchData();
}, []);


const [formData, setFormData] = useState<Partial<MappingJP>>(() => {
    return {
      jobId: '',
      jobName: '',
      piId: '',
      piName: '',
      piImpactValue: 0,
      notes: ''
    };
  });
  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
     {
      setFormData({
        jobId: '',
        jobName: '',
        piId: '',
       piName: '',
       piImpactValue: 0,
        notes: ''
      });
    }
  }, [initialData, open]);
  useEffect(() => {
    console.log('formData updated:', formData);
  }, [formData]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a copy of the form data for submission
    const submissionData = { ...formData };
    
    // Format the deadline for API submission
   
    
    // Submit the data to the parent component
    onSubmit(submissionData);
  };

  const handleNumberChange = (field: keyof MappingJP, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setFormData({...formData, [field]: numValue});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Mapping' : 'Edit Mapping'}
            </DialogTitle>
          </DialogHeader>
          
          
          <div className="grid gap-4 py-4">
          
        
        
            {/* <div className="grid items-center gap-2">
              <Label htmlFor="name" className="text-left">
                PI Id <span className="text-red-500">*</span>
              </Label>
              <Input
                id="piId"
                value={formData.piId || ''}
                onChange={(e) => setFormData({...formData, piId: e.target.value})}
                placeholder="Enter value"
                required
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="jobId" className="text-left">
                Job Id <span className="text-red-500">*</span>
              </Label>
              <Input
                id="jobId"
                value={formData.jobId || ''}
                onChange={(e) => setFormData({...formData, jobId: e.target.value})}
                placeholder="Enter value"
                required
              />
            </div> */}
            
            <Autocomplete
  id="job-select"
  options={jobs}
  getOptionLabel={(option) => option.title || ''}
  value={jobs.find(job => job._id === formData.jobId) || null}
  onChange={(event, newValue) => {
    console.log('Job selected:', newValue);
    setFormData(prev => ({
      ...prev,
      jobId: newValue ? newValue._id : '',
      jobName: newValue ? newValue.title : ''
    }));
  }}
  renderInput={(params) => <TextField {...params} label="Job" required />}
  isOptionEqualToValue={(option, value) => option._id === value._id}
/>



<Autocomplete
  id="pi-select"
  options={pis}
  getOptionLabel={(option) => option.name || ''}
  value={pis.find(pi => pi._id === formData.piId) || null}
  onChange={(event, newValue) => {
    console.log('PI selected:', newValue);
    setFormData(prev => ({
      ...prev,
      piId: newValue ? newValue._id : '',
      piName: newValue ? newValue.name : ''
    }));
  }}
  renderInput={(params) => <TextField {...params} label="PI" required />}
/>



            <div className="grid items-center gap-2">
              <Label htmlFor="PiImpactValue" className="text-left">
                PI Impact Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="piImpactValue"
                type="number"
                value={formData.piImpactValue}
                onChange={(e) => handleNumberChange('piImpactValue', e.target.value)}
                placeholder="0"
                required
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="notes" className="text-left">
                PI notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Enter value"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
              {mode === 'create' ? 'Map' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}