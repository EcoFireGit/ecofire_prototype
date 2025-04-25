// components/pi-qbo-mapping/pi-qbo-mapping-dialog.tsx
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
import { PIQBOMapping } from "@/lib/models/pi-qbo-mapping.model";
import { QBOs } from "@/lib/models/qbo.model";
import { PIs } from "@/lib/models/pi.model";

export type MappingFormData = {
  id?: string;
  piId: string;
  qboId: string;
  piTarget: number | undefined;
  qboTarget: number | undefined;
  qboImpact: number | undefined;
  notes?: string;
};

interface PIQBOMappingDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mapping: MappingFormData) => void;
  initialData?: PIQBOMapping;
  pisList: PIs[];
  qbosList: QBOs[];
}

export function PIQBOMappingDialog({ 
  mode, 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  pisList,
  qbosList
}: PIQBOMappingDialogProps) {
  const [formData, setFormData] = useState<MappingFormData>(() => {
    if (initialData) {
      return {
        id: initialData._id,
        piId: initialData.piId,
        qboId: initialData.qboId,
        piTarget: initialData.piTarget,
        qboTarget: initialData.qboTarget,
        qboImpact: initialData.qboImpact,
        notes: initialData.notes
      };
    }
    return {
      piId: '',
      qboId: '',
      piTarget: undefined,
      qboTarget: undefined,
      qboImpact: undefined,
      notes: ''
    };
  });

  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData._id,
        piId: initialData.piId,
        qboId: initialData.qboId,
        piTarget: initialData.piTarget,
        qboTarget: initialData.qboTarget,
        qboImpact: initialData.qboImpact,
        notes: initialData.notes
      });
    } else {
      setFormData({
        piId: '',
        qboId: '',
        piTarget: undefined,
        qboTarget: undefined,
        qboImpact: undefined,
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
      piTarget: selectedPI ? selectedPI.targetValue : undefined
    });
  };

  const handleQBOChange = (qboId: string) => {
    const selectedQBO = qbosList.find(qbo => qbo._id === qboId);
    
    setFormData({
      ...formData,
      qboId,
      qboTarget: selectedQBO ? selectedQBO.targetValue : undefined
    });
  };

  const handleNumberChange = (field: keyof MappingFormData, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setFormData({...formData, [field]: numValue});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Map PI to QBO' : 'Edit PI-QBO Mapping'}
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
                value={formData.piTarget === undefined ? '' : formData.piTarget}
                onChange={(e) => handleNumberChange('piTarget', e.target.value)}
                placeholder="0"
                readOnly
                className="bg-gray-100"
              />
              <span className="text-xs text-gray-500">Automatically computed</span>
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="qboId" className="text-left">
                QBO name <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.qboId} 
                onValueChange={handleQBOChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {qbosList.map(qbo => (
                    <SelectItem key={qbo._id} value={qbo._id}>
                      {qbo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="qboTarget" className="text-left">
                QBO Target
              </Label>
              <Input
                id="qboTarget"
                type="number"
                value={formData.qboTarget === undefined ? '' : formData.qboTarget}
                onChange={(e) => handleNumberChange('qboTarget', e.target.value)}
                placeholder="0"
                readOnly
                className="bg-gray-100"
              />
              <span className="text-xs text-gray-500">Automatically computed</span>
            </div>
            
            <div className="grid items-center gap-2">
              <Label htmlFor="qboImpact" className="text-left">
                QBO Impact <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qboImpact"
                type="number"
                value={formData.qboImpact === undefined ? '' : formData.qboImpact}
                onChange={(e) => handleNumberChange('qboImpact', e.target.value)}
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
              {mode === 'create' ? 'Map PI to QBO' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}