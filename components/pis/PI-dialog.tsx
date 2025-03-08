// components/pis/pi-dialog.tsx

import { Button } from "@/components/ui/button";
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
import { PI } from "./table/columns";

interface PIDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pi: Partial<PI>) => void;
  initialData?: PI;
}

export function PIDialog({ 
  mode, 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData 
}: PIDialogProps) {
  const [formData, setFormData] = useState<Partial<PI>>(() => {
    
    return {
      name: '',
      unit: '',
      beginningValue: 0,
      targetValue: 0,
      deadline: '',
      notes: ''
    };
  });

  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
     {
      setFormData({
        name: '',
        unit: '',   
        beginningValue: 0,     
        targetValue: 0,  
        deadline: '',      
        notes: ''
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a copy of the form data for submission
    const submissionData = { ...formData };
    
    // Format the deadline for API submission
   
    
    // Submit the data to the parent component
    onSubmit(submissionData);
  };

  const handleNumberChange = (field: keyof PI, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setFormData({...formData, [field]: numValue});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add PI' : 'Edit PI'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <Label htmlFor="name" className="text-left">
                PI name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter value"
                required
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="unit" className="text-left">
                PI unit
              </Label>
              <Input
                id="unit"
                value={formData.unit || ''}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="Enter value"
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="beginningValue" className="text-left">
                Beginning value
              </Label>
              <Input
                id="beginningValue"
                type="number"
                value={formData.beginningValue}
                onChange={(e) => handleNumberChange('beginningValue', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="grid items-center gap-2">
              <Label htmlFor="targetValue" className="text-left">
                PI target <span className="text-red-500">*</span>
              </Label>
              <Input
                id="targetValue"
                type="number"
                value={formData.targetValue}
                onChange={(e) => handleNumberChange('targetValue', e.target.value)}
                placeholder="0"
                required
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="deadline" className="text-left">
                PI Deadline <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline || ''}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
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
              {mode === 'create' ? 'Add PI' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}