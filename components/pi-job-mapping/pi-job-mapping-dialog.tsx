// components/pis/pi-dialog.tsx

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  pisList?: any[];
  jobsList?: any[];
}

export function MappingDialog({ 
  mode, 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  pisList = [],
  jobsList = []
}: MappingDialogProps) {
  const [formData, setFormData] = useState<Partial<MappingJP>>(() => {
    if (initialData) {
      return {
        id: initialData.id,
        jobId: initialData.jobId || '',
        jobName: initialData.jobName || '',
        piId: initialData.piId || '',
        piName: initialData.piName || '',
        piImpactValue: initialData.piImpactValue || 0,
        piTarget: initialData.piTarget || 0,
        notes: initialData.notes || ''
      };
    }
    return {
      jobId: '',
      jobName: '',
      piId: '',
      piName: '',
      piImpactValue: 0,
      piTarget: 0,
      notes: ''
    };
  });

  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        jobId: initialData.jobId || '',
        jobName: initialData.jobName || '',
        piId: initialData.piId || '',
        piName: initialData.piName || '',
        piImpactValue: initialData.piImpactValue || 0,
        piTarget: initialData.piTarget || 0,
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        jobId: '',
        jobName: '',
        piId: '',
        piName: '',
        piImpactValue: 0,
        piTarget: 0,
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
    
    // Submit the data to the parent component
    onSubmit(submissionData);
    
    // Close the dialog
    onOpenChange(false);
  };

  const handlePIChange = (piId: string) => {
    const selectedPI = pisList.find(pi => pi._id === piId);
    
    setFormData({
      ...formData,
      piId,
      piName: selectedPI ? selectedPI.name : '',
      piTarget: selectedPI ? selectedPI.targetValue : 0
    });
  };

  const handleJobChange = (jobId: string) => {
    const selectedJob = jobsList.find(job => job._id === jobId);
    
    setFormData({
      ...formData,
      jobId,
      jobName: selectedJob ? selectedJob.title : ''
    });
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
            <div className="grid items-center gap-2">
              <Label htmlFor="piId" className="text-left">
                Output name <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.piId as string} 
                onValueChange={handlePIChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a PI" />
                </SelectTrigger>
                <SelectContent>
                  {pisList.map(pi => (
                    <SelectItem key={pi._id} value={pi._id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="piTarget" className="text-left">
                Output Target
              </Label>
              <Input
                id="piTarget"
                type="number"
                value={formData.piTarget || 0}
                onChange={(e) => handleNumberChange('piTarget', e.target.value)}
                placeholder="0"
                readOnly
                className="bg-gray-100"
              />
              <span className="text-xs text-gray-500">Automatically computed</span>
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="jobId" className="text-left">
                Job name <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.jobId as string} 
                onValueChange={handleJobChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Job" />
                </SelectTrigger>
                <SelectContent>
                  {jobsList.map(job => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="piImpactValue" className="text-left">
                Output Impact Value <span className="text-red-500">*</span>
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
                Output notes
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