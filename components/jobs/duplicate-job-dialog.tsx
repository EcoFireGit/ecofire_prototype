
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
import { useState, useEffect } from "react";
import { Job } from "./table/columns";

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
  const [formData, setFormData] = useState<Partial<Job>>({});

  useEffect(() => {
    if (open && sourceJob) {
      setFormData({
        ...sourceJob,
        title: `${sourceJob.title} (Copy)`,
        dueDate: sourceJob.dueDate
          ? new Date(sourceJob.dueDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [open, sourceJob]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = { ...formData };

    if (submissionData.dueDate) {
      submissionData.dueDate = `${submissionData.dueDate}T00:00:00.000Z`;
    }

    await onSubmit(submissionData);
    onOpenChange(false);
    setFormData({});
    // Force a refresh using a custom event
    const event = new CustomEvent('jobs-update');
    window.dispatchEvent(event);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
            <Button type="submit">Create Duplicate</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
