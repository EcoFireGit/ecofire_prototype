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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Job } from "./table/columns";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/lib/models/task.model";

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && sourceJob) {
      setFormData({
        ...sourceJob,
        title: `${sourceJob.title} (Copy)`,
        nextTaskId: undefined,
        tasks: [],
        dueDate: sourceJob.dueDate
          ? new Date(sourceJob.dueDate).toISOString().split("T")[0]
          : "",
      });
      setIsLoading(false);
    }
  }, [open, sourceJob]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const submissionData = { ...formData };
    if (submissionData.dueDate) {
      submissionData.dueDate = `${submissionData.dueDate}T00:00:00.000Z`;
    }

    // Show initial toast notification immediately
    toast({
      title: "Duplicating Job",
      description: `Creating a copy of "${sourceJob.title}" with all its tasks...`,
    });

    try {
      // Create the duplicated job
      const jobResponse = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const jobResult = await jobResponse.json();

      if (jobResult.success && jobResult.data) {
        const newJobId = jobResult.data._id;
        const newJobTitle = jobResult.data.title;

        // Fetch tasks of the original job
        const tasksResponse = await fetch(`/api/tasks?jobId=${sourceJob.id}`);
        const tasksResult = await tasksResponse.json();

        if (tasksResult.success && tasksResult.data) {
          // Keep track of newly created tasks
          const newTasksMap: Record<string, string> = {}; // Maps original task titles to new task IDs
          const newTaskIds: string[] = []; // Array to store all new task IDs

          // Create new tasks for the duplicated job
          for (const task of tasksResult.data) {
            const newTask = {
              ...task,
              jobId: newJobId,
              completed: false,
            };
            delete newTask._id;
            delete newTask.id;

            const taskResponse = await fetch("/api/tasks", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newTask),
            });

            const taskResult = await taskResponse.json();

            if (taskResult.success && taskResult.data) {
              // Store the new task ID with its title as key
              newTasksMap[task.title] = taskResult.data._id;
              newTaskIds.push(taskResult.data._id);
            }
          }

          // Update the job with the list of new task IDs
          await fetch(`/api/jobs/${newJobId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tasks: newTaskIds }),
          });

          // If the source job has a next task, find the corresponding task in the new job
          if (sourceJob.nextTaskId) {
            // Find the title of the next task in the original job
            const nextTaskDetails = tasksResult.data.find(
              (task: Task) =>
                task.id === sourceJob.nextTaskId ||
                task._id === sourceJob.nextTaskId,
            );

            if (nextTaskDetails && newTasksMap[nextTaskDetails.title]) {
              // Set the nextTaskId of the new job
              await fetch(`/api/jobs/${newJobId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  nextTaskId: newTasksMap[nextTaskDetails.title],
                }),
              });
            }
          }
        }

        // Fetch all PI-job mappings to find those associated with the original job
        const mappingsResponse = await fetch("/api/pi-job-mappings");
        const mappingsResult = await mappingsResponse.json();

        if (mappingsResult.success && mappingsResult.data) {
          // Filter mappings to get only those for the original job
          const originalJobMappings = mappingsResult.data.filter(
            (mapping: any) => mapping.jobId === sourceJob.id,
          );

          // Create new mappings for each original mapping
          for (const mapping of originalJobMappings) {
            const newMapping = {
              jobId: newJobId,
              jobName: newJobTitle,
              piId: mapping.piId,
              piName: mapping.piName,
              piImpactValue: mapping.piImpactValue,
              piTarget: mapping.piTarget || 0,
              notes: `Duplicated from job: ${sourceJob.title}`,
            };

            await fetch("/api/pi-job-mappings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newMapping),
            });
          }
        }

        // Show success toast
        toast({
          title: "Job Duplicated",
          description: `Successfully duplicated "${sourceJob.title}" with all its tasks`,
        });

        // Close the dialog and refresh the page
        onOpenChange(false);
        window.location.reload();
      } else {
        throw new Error(jobResult.error || "Failed to create job");
      }
    } catch (error) {
      console.error("Error during job duplication:", error);
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
              {isLoading ? "Duplicating job" : "Create Duplicate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
