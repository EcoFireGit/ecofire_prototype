// components/jobs/job-dialog.tsx
'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback, useRef } from "react";
import { Job } from "./table/columns";
import { CreateDialog } from "@/components/business-functions/create-dialog";
import { useToast } from "@/hooks/use-toast";

interface BusinessFunction {
  id: string;
  name: string;
}

interface JobDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (job: Partial<Job>) => void;
  initialData?: Job;
}

const emptyFormState = {
  title: "",
  notes: "",
  owner: "",
  businessFunctionId: undefined as string | undefined,
  dueDate: "",
  isDone: false,
};

export function JobDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: JobDialogProps) {
  const [formData, setFormData] = useState<Partial<Job>>(emptyFormState);
  const [businessFunctions, setBusinessFunctions] = useState<BusinessFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const { toast } = useToast();
  const creationToastRef = useRef<{ id: string; dismiss: () => void } | null>(null);

  // Initialize form data
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        ...initialData,
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : "",
      });
    } else if (mode === "create") {
      setFormData(emptyFormState);
    }
  }, [mode, initialData, open]);

  // Fetch business functions with auto-selection
  const fetchBusinessFunctions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/business-functions");
      const result = await response.json();

      if (response.ok && result.data) {
        const formattedFunctions = result.data.map((bf: any) => ({
          id: bf._id || bf.id,
          name: bf.name,
        }));
        setBusinessFunctions(formattedFunctions);

        // Auto-select the last created function if it exists in the list
        if (lastCreatedId && formattedFunctions.some((bf: { id: string; }) => bf.id === lastCreatedId)) {
          setFormData(prev => ({
            ...prev,
            businessFunctionId: lastCreatedId,
          }));
          setLastCreatedId(null);
        }
        // Auto-select if only one exists in create mode
        else if (formattedFunctions.length === 1 && mode === "create" && !formData.businessFunctionId) {
          setFormData(prev => ({
            ...prev,
            businessFunctionId: formattedFunctions[0].id,
          }));
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [lastCreatedId, mode]);

  useEffect(() => {
    if (open) {
      fetchBusinessFunctions();
    }
  }, [open, fetchBusinessFunctions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = { ...formData };

    if (submissionData.dueDate) {
      submissionData.dueDate = `${submissionData.dueDate}T00:00:00.000Z`;
    }

    // Show the creation in progress toast
    setIsSubmitting(true);
    creationToastRef.current = toast({
      title: "Creating job...",
      description: "Your job is being created. Please wait.",
      duration: 100000, // Long duration to ensure it stays visible
    });

    // Pass the submission data to parent component
    onSubmit(submissionData);
    
    // Close the dialog
    onOpenChange(false);
  };

  const handleCreateBusinessFunction = async (name: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/business-functions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const newId = result.data._id || result.data.id;
        setLastCreatedId(newId);
        await fetchBusinessFunctions(); // Force immediate refresh
      }
    } catch (error) {
      console.error("Creation error:", error);
    } finally {
      setLoading(false);
      setIsCreateDialogOpen(false);
    }
  };

  const handleSelectChange = (value: string) => {
    if (value === "create-new") {
      setIsCreateDialogOpen(true);
      return;
    }
    setFormData(prev => ({
      ...prev,
      businessFunctionId: value === "none" ? undefined : value,
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Create New Job" : "Edit Job"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="col-span-3 min-h-[100px]"
                  placeholder="Add any notes or description for this job..."
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="businessFunction" className="text-right">
                  Business Function
                </Label>
                <div className="col-span-3">
                  <Select
                    disabled={loading}
                    value={formData.businessFunctionId || "none"}
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue 
                        placeholder={loading ? "Loading..." : "Select business function"} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {businessFunctions.map((bf) => (
                        <SelectItem key={bf.id} value={bf.id}>
                          {bf.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new">
                        + Create New Business Function
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || isSubmitting}>
                {isSubmitting ? 
                  (mode === "create" ? "Creating..." : "Saving...") : 
                  (mode === "create" ? "Create" : "Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateBusinessFunction}
      />
    </>
  );
}
