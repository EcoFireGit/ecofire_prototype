// components/qbos/qbo-dialog.tsx

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
import { QBO } from "./table/columns";

interface QBODialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (qbo: Partial<QBO>) => void;
  initialData?: QBO;
}

export function QBODialog({ 
  mode, 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData 
}: QBODialogProps) {
  const [formData, setFormData] = useState<Partial<QBO>>(() => {
    if (initialData) {
      return {
        ...initialData,
        // Format deadline for date input (YYYY-MM-DD) ensuring no timezone issues
        deadline: initialData.deadline ? formatDateForInput(initialData.deadline) : ''
      };
    }
    return {
      name: '',
      unit: '',
      beginningValue: undefined,
      currentValue: undefined,
      targetValue: undefined,
      deadline: '',
      points: undefined,
      notes: ''
    };
  });

  // Helper function to format date string for input element
  function formatDateForInput(dateString: string): string {
    // Create date at noon to avoid timezone issues
    const date = new Date(dateString);
    // Ensure it's using local timezone and correct UTC date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        deadline: initialData.deadline ? formatDateForInput(initialData.deadline) : ''
      });
    } else {
      setFormData({
        name: '',
        unit: '',
        beginningValue: undefined,
        currentValue: undefined,
        targetValue: undefined,
        deadline: '',
        points: undefined,
        notes: ''
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a copy of the form data for submission
    const submissionData = { ...formData };
    
    // Format the deadline for API submission, ensuring it's a fixed UTC time
    if (submissionData.deadline) {
      // Set noon UTC time to avoid date shifting due to timezone conversion
      const [year, month, day] = submissionData.deadline.split('-').map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      submissionData.deadline = dateObj.toISOString();
    }
    
    // Submit the data to the parent component
    onSubmit(submissionData);
    onOpenChange(false);
  };

  const handleNumberChange = (field: keyof QBO, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setFormData({...formData, [field]: numValue});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Outcome' : 'Edit Outcome'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <Label htmlFor="name" className="text-left">
                Outcome name <span className="text-red-500">*</span>
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
              Outcome unit
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
                value={formData.beginningValue === undefined ? '' : formData.beginningValue}
                onChange={(e) => handleNumberChange('beginningValue', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="currentValue" className="text-left">
                Current value
              </Label>
              <Input
                id="currentValue"
                type="number"
                value={formData.currentValue === undefined ? '' : formData.currentValue}
                onChange={(e) => handleNumberChange('currentValue', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="targetValue" className="text-left">
              Outcome target <span className="text-red-500">*</span>
              </Label>
              <Input
                id="targetValue"
                type="number"
                value={formData.targetValue === undefined ? '' : formData.targetValue}
                onChange={(e) => handleNumberChange('targetValue', e.target.value)}
                placeholder="0"
                required
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="deadline" className="text-left">
              Outcome Deadline <span className="text-red-500">*</span>
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
              <Label htmlFor="points" className="text-left">
              Outcome points <span className="text-red-500">*</span>
              </Label>
              <Input
                id="points"
                type="number"
                value={formData.points === undefined ? '' : formData.points}
                onChange={(e) => handleNumberChange('points', e.target.value)}
                placeholder="0"
                required
              />
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="notes" className="text-left">
              Outcome notes
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
              {mode === 'create' ? 'Add Outcome' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}