"use client";

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
import { Job } from "./table/columns";
import { useToast } from "@/hooks/use-toast";

interface DuplicateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (job: Partial<Job>) => void;
  sourceJob: Job;
}

export function DuplicateJobDialog({
  open,
  onOpenChange,
  onSubmit,
  sourceJob,
}: DuplicateJobDialogProps) {
  // State for form data and loading status
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && sourceJob) {
      setFormData({
        ...sourceJob,
        title: `${sourceJob.title} (Copy)`,
        dueDate: sourceJob.dueDate
          ? new Date(sourceJob.dueDate).toISOString().split("T")[0]
          : "",
      });
      setIsLoading(false);
    }
  }, [open, sourceJob]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Format due date for API
    const submissionData = { ...formData };
    if (submissionData.dueDate) {
      submissionData.dueDate = `${submissionData.dueDate}T00:00:00.000Z`;
    }

    try {
      // Send request to backend endpoint for job duplication
      const response = await fetch("/api/jobs/duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceJobId: sourceJob.id, // Pass the source job ID
          newJobData: submissionData // Pass the new job data
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Show success toast
        toast({
          title: "Job Duplicated",
          description: `Successfully duplicated "${sourceJob.title}" with all its tasks`,
        });

        // Close dialog and refresh page
        onOpenChange(false);
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to duplicate job");
      }
    } catch (error) {
      console.error("Error during job duplication:", error);
      // Reset loading state on error
      setIsLoading(false);
      toast({
        title: "Duplication Failed",
        description:
          "There was an error duplicating the job. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Duplicate Job</DialogTitle>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Duplicating job..." : "Create Duplicate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}