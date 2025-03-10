// components/pi-job-mapping/pi-job-mapping-dialog.tsx
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
import { JobPiMapping } from "@/lib/models/pi-job-mapping.model";
import { Jobs } from "@/lib/models/job.model";
import { PIs } from "@/lib/models/pi.model";

export type MappingFormData = {
  id?: string;
  jobId: string;
  piId: string;
 // jobName: string;
  //piName: string;
  piTarget: number;
  piImpactValue: number;
  notes?: string;
  
};

interface PIJOBMappingDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mapping: MappingFormData) => void;
  initialData?: JobPiMapping;
  pisList: PIs[];
  jobsList: Jobs[];
}

export function PIJobMappingDialog({ 
  mode, 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  pisList,
  jobsList
}: PIJOBMappingDialogProps) {
  const [formData, setFormData] = useState<MappingFormData>(() => {
    if (initialData) {
      return {
        id: initialData._id,
        piId: initialData.piId,
        jobId: initialData.jobId,
        piTarget: initialData.piTarget,
        piImpactValue: initialData.piImpactValue,
        notes: initialData.notes
      };
    }
    return {
      piId: '',
      jobId: '',
      piTarget: 0,
      piImpactValue: 0,
      notes: ''
    };
  });

  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData._id,
        piId: initialData.piId,
        jobId: initialData.jobId,
        piTarget: initialData.piTarget,
        piImpactValue: initialData.piImpactValue,
        notes: initialData.notes
      });
    } else {
      setFormData({
        piId: '',
        jobId: '',
        piTarget: 0,
        piImpactValue: 0,
        notes: ''
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const handlePIChange = (piId: string) => {
    const selectedPI = pisList.find(pi => pi._id === piId);
    
    setFormData({
      ...formData,
      piId,
      piTarget: selectedPI ? selectedPI.targetValue : 0
    });
  };

  const handleJobChange = (jobId: string) => {
    const selectedJob = jobsList.find(job => job._id === jobId);
    
    setFormData({
      ...formData,
      jobId
    });
  };

  const handleNumberChange = (field: keyof MappingFormData, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setFormData({...formData, [field]: numValue});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Map PI to Job' : 'Edit PI-Job Mapping'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <Label htmlFor="piId" className="text-left">
                PI name <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.piId} 
                onValueChange={handlePIChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
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
                PI Target
              </Label>
              <Input
                id="piTarget"
                type="number"
                value={formData.piTarget}
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
                value={formData.jobId} 
                onValueChange={handleJobChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
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
                PI Impact <span className="text-red-500">*</span>
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
                Notes
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
              {mode === 'create' ? 'Map PI to Job' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}