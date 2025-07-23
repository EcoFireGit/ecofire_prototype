import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "./tag-input";
import { Task, FocusLevel, JoyLevel, RecurrenceInterval } from "./types";
import { useToast } from "@/hooks/use-toast";

interface Owner { _id: string; name: string; userId: string; }
interface Job { _id: string; title: string; isDone?: boolean; }

interface DuplicateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTask: Task;
  onSubmit: (task: Partial<Task>) => void;
}

export function DuplicateTaskDialog({
  open,
  onOpenChange,
  sourceTask,
  onSubmit,
}: DuplicateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [owner, setOwner] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<string>("");
  const [requiredHours, setRequiredHours] = useState<number | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<FocusLevel | undefined>(undefined);
  const [joyLevel, setJoyLevel] = useState<JoyLevel | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobError, setJobError] = useState<string | null>(null);
  const [recurrenceError, setRecurrenceError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch jobs and owners for dropdowns
  useEffect(() => {
    if (open) {
      fetch("/api/jobs")
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setJobs(data.data.filter((job: any) => !job.isDone));
          }
        });
      fetch("/api/owners")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setOwners(data);
          else if (data.data && Array.isArray(data.data)) setOwners(data.data);
        });
    }
  }, [open]);

  // Pre-fill form from sourceTask
  useEffect(() => {
    if (open && sourceTask) {
      setTitle(`${sourceTask.title} (Copy)`);
      setJobId(sourceTask.jobId);
      setOwner(sourceTask.owner);
      setDate(sourceTask.date ? sourceTask.date.split("T")[0] : "");
      setRequiredHours(sourceTask.requiredHours);
      setFocusLevel(sourceTask.focusLevel);
      setJoyLevel(sourceTask.joyLevel);
      setNotes(sourceTask.notes);
      setTags(sourceTask.tags || []);
      setIsRecurring(!!sourceTask.isRecurring);
      setRecurrenceInterval(sourceTask.recurrenceInterval);
      setJobError(null);
      setRecurrenceError(null);
      setIsLoading(false);
    }
  }, [open, sourceTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || jobId === "none") {
      setJobError("Please assign a job to this task.");
      return;
    } else {
      setJobError(null);
    }
    if (isRecurring && !recurrenceInterval) {
      setRecurrenceError("Please select a recurrence interval.");
      return;
    } else {
      setRecurrenceError(null);
    }
    setIsLoading(true);
    try {
      const newTaskData: Partial<Task> = {
        title,
        jobId,
        owner,
        date: date ? `${date}T00:00:00.000Z` : "",
        requiredHours,
        focusLevel,
        joyLevel,
        notes,
        tags,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
      };
      // Call the duplicate API endpoint
      const response = await fetch(`/api/tasks/${sourceTask.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newTaskData }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Task Duplicated",
          description: `Successfully duplicated \"${sourceTask.title}\"`,
        });
        onOpenChange(false);
        setIsLoading(false);
        if (onSubmit) onSubmit(result.data);
      } else {
        throw new Error(result.error || "Failed to duplicate task");
      }
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Duplication Failed",
        description: "There was an error duplicating the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Duplicate Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title <span className="text-red-500">*</span></Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="col-span-3" required />
            </div>
            {/* Job Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="job" className="text-right">Job <span className="text-red-500">*</span></Label>
              <div className="col-span-3">
                <Select value={jobId || "none"} required onValueChange={value => setJobId(value === "none" ? undefined : value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {jobs.map(job => (
                      <SelectItem key={job._id} value={job._id}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jobError && <p className="text-sm text-red-500 mt-1">{jobError}</p>}
              </div>
            </div>
            {/* Owner */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="owner" className="text-right">Owner</Label>
              <div className="col-span-3">
                <Select value={owner || "none"} onValueChange={value => setOwner(value === "none" ? undefined : value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {owners.map(ownerItem => (
                      <SelectItem key={ownerItem._id} value={ownerItem._id}>{ownerItem.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Do Date</Label>
              <Input id="date" type="date" value={date || ""} onChange={e => setDate(e.target.value)} className="col-span-3" />
            </div>
            {/* Hours */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requiredHours" className="text-right">Hours Required</Label>
              <Input id="requiredHours" type="number" min="0" step="any" value={requiredHours === undefined ? "" : requiredHours} onChange={e => setRequiredHours(e.target.value === "" ? undefined : parseFloat(e.target.value))} className="col-span-3" />
            </div>
            {/* Focus */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="focusLevel" className="text-right">Focus Level</Label>
              <div className="col-span-3">
                <Select value={focusLevel || "none"} onValueChange={value => value === "none" ? setFocusLevel(undefined) : setFocusLevel(value as FocusLevel)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select focus level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value={FocusLevel.High}>{FocusLevel.High}</SelectItem>
                    <SelectItem value={FocusLevel.Medium}>{FocusLevel.Medium}</SelectItem>
                    <SelectItem value={FocusLevel.Low}>{FocusLevel.Low}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Joy */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="joyLevel" className="text-right">Joy Level</Label>
              <div className="col-span-3">
                <Select value={joyLevel || "none"} onValueChange={value => value === "none" ? setJoyLevel(undefined) : setJoyLevel(value as JoyLevel)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select joy level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value={JoyLevel.High}>{JoyLevel.High}</SelectItem>
                    <SelectItem value={JoyLevel.Medium}>{JoyLevel.Medium}</SelectItem>
                    <SelectItem value={JoyLevel.Low}>{JoyLevel.Low}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Tags */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tags" className="text-right">Tags</Label>
              <div className="col-span-3">
                <TagInput value={tags} onChange={setTags} placeholder="Add tags (press Enter after each tag)" />
                <p className="text-xs text-muted-foreground mt-1">Press Enter or comma after each tag, or click Add</p>
              </div>
            </div>
            {/* Notes */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Textarea id="notes" value={notes || ""} onChange={e => setNotes(e.target.value || undefined)} className="col-span-3 min-h-[100px]" placeholder="Add any notes for this task..." />
            </div>
            {/* Recurring Task */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isRecurring" className="text-right">Recurring Task</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox id="isRecurring" checked={isRecurring} onCheckedChange={checked => setIsRecurring(!!checked)} />
                <span className="text-sm">Set as recurring</span>
              </div>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrenceInterval" className="text-right">Recurrence Interval</Label>
                <div className="col-span-3">
                  <Select value={recurrenceInterval || "none"} onValueChange={value => { setRecurrenceError(null); value === "none" ? setRecurrenceInterval(undefined) : setRecurrenceInterval(value as RecurrenceInterval); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value={RecurrenceInterval.Daily}>Daily</SelectItem>
                      <SelectItem value={RecurrenceInterval.Weekly}>Weekly</SelectItem>
                      <SelectItem value={RecurrenceInterval.Biweekly}>Biweekly</SelectItem>
                      <SelectItem value={RecurrenceInterval.Monthly}>Monthly</SelectItem>
                      <SelectItem value={RecurrenceInterval.Quarterly}>Quarterly</SelectItem>
                      <SelectItem value={RecurrenceInterval.Annually}>Annually</SelectItem>
                    </SelectContent>
                  </Select>
                  {recurrenceError && <p className="text-sm text-red-500 mt-1">{recurrenceError}</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Duplicating..." : "Duplicate"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 