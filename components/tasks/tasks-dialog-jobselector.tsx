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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Task, FocusLevel, JoyLevel, RecurrenceInterval } from "./types";
import { TagInput } from "@/components/tasks/tag-input";
import { saveTags } from "@/lib/services/task-tags.service";
import { JobDialog } from "@/components/jobs/job-dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Define Owner interface to match MongoDB document
interface Owner {
  _id: string;
  name: string;
  userId: string;
}

// Define task response interface
interface TaskResponse {
  success: boolean;
  data?: {
    _id: string;
    [key: string]: any;
  };
  error?: string;
}

interface TaskDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Partial<Task>) => Promise<void>;
  initialData?: Task;
  jobs?: any; // Add jobs prop
  jobId?: string; // Allow direct jobId prop
}

export function TaskDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  initialData,
  jobs,
  jobId: propJobId,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<string>("");
  const [requiredHours, setRequiredHours] = useState<number | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<FocusLevel | undefined>(undefined);
  const [joyLevel, setJoyLevel] = useState<JoyLevel | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval | undefined>(undefined);
  const [recurrenceError, setRecurrenceError] = useState<string | null>(null);

  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // New owner creation
  const [isCreatingOwner, setIsCreatingOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");

  // Job State Management
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobComboboxOpen, setJobComboboxOpen] = useState(false);

  const { toast } = useToast();

  // Initialize jobId from props
  useEffect(() => {
    if (propJobId && mode === "create" && open) {
      setJobId(propJobId);
    }
  }, [propJobId, mode, open]);

  useEffect(() => {
    const fetchOwners = async () => {
      setIsLoadingOwners(true);
      setOwnerError(null);
      try {
        const response = await fetch("/api/owners");
        if (!response.ok)
          throw new Error(`Failed to fetch owners: ${response.status}`);
        const ownersData = await response.json();
        setOwners(ownersData);
      } catch (error) {
        console.error("Error fetching owners:", error);
        setOwnerError("Failed to load owners. Please try again.");
      } finally {
        setIsLoadingOwners(false);
      }
    };

    if (open) {
      fetchOwners();
    }
  }, [open]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mode === "create") {
        setTitle("");
        setOwner(undefined);
        setDate("");
        setRequiredHours(undefined);
        setFocusLevel(undefined);
        setJoyLevel(undefined);
        setNotes(undefined);
        setTags([]);
        setIsRecurring(false);
        setRecurrenceInterval(undefined);
        setJobComboboxOpen(false);
        if (propJobId) {
          setJobId(propJobId);
        } else {
          setJobId(undefined);
        }
      } else if (initialData) {
        setTitle(initialData.title);
        setOwner(initialData.owner);
        if (initialData.date) {
          setDate(new Date(initialData.date).toISOString().split("T")[0]);
        } else {
          setDate("");
        }
        setRequiredHours(initialData.requiredHours);
        setFocusLevel(initialData.focusLevel);
        setJoyLevel(initialData.joyLevel);
        setNotes(initialData.notes);
        setTags(initialData.tags || []);
        setJobId(initialData.jobId);
        setIsRecurring(initialData.isRecurring || false);
        setRecurrenceInterval(initialData.recurrenceInterval);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [mode, initialData, open, propJobId]);

  const [jobsList, setJobsList] = useState<Record<string, any>>(jobs || {});

  // Refresh jobs list when jobs prop changes
  useEffect(() => {
    if (jobs) {
      setJobsList(jobs);
    }
  }, [jobs]);

  // Filter jobs based on search term
  const filteredJobs = Object.entries(jobsList)
    .filter(([id, job]: [string, any]) => !job.isDone);

  // Get the selected job title for display
  const selectedJobTitle = jobId ? jobsList[jobId]?.title : "";

  const handleNewJobSubmit = async (jobData: any) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) throw new Error("Failed to create job");
      const createdJob = await response.json();

      const newJobId = createdJob.data?._id || createdJob._id || createdJob.id;

      // Update the jobId with the newly created job
      setJobId(newJobId);

      // Add the new job to our local jobs list
      setJobsList((prevJobs) => ({
        ...prevJobs,
        [newJobId]: {
          _id: newJobId,
          title: jobData.title || createdJob.data?.title || "New Job",
          isDone: false, // New jobs are not done
          ...createdJob.data,
        },
      }));

      // Close the job dialog
      setIsJobDialogOpen(false);

      toast({
        title: "Success",
        description: "Job created successfully",
      });
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  // Helper function to update job tasks
  const updateJobTasks = async (
    jobId: string,
    taskId: string,
  ): Promise<void> => {
    try {
      // First fetch the current job to get its tasks
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error(`Failed to fetch job: ${jobResponse.status}`);
      }

      const jobData = await jobResponse.json();
      const currentTasks = jobData.data?.tasks || [];

      // Add the new task ID to the tasks array
      const updatedTasks = [...currentTasks, taskId];

      // Update the job with the new tasks array
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tasks: updatedTasks }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update job tasks: ${response.status}`);
      }

      // Trigger a job progress update event
      const event = new CustomEvent("job-progress-update", {
        detail: { jobId: jobId },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating job tasks:", error);
      throw error;
    }
  };

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
    setIsSubmitting(true);

    try {
      // Always include title in the task
      const task: Partial<Task> = { title };

      // Always include jobId if it exists
      if (jobId) task.jobId = jobId;

      if (owner) task.owner = owner;
      if (date) {
        task.date = `${date}T00:00:00.000Z`;
      } else {
        task.date = "";
      }
      if (requiredHours !== undefined) task.requiredHours = requiredHours;
      if (focusLevel) task.focusLevel = focusLevel;
      if (joyLevel) task.joyLevel = joyLevel;
      if (notes) task.notes = notes;
      if (tags.length > 0) task.tags = tags;
      if (isRecurring) {
        task.isRecurring = true;
        task.recurrenceInterval = recurrenceInterval;
      } else {
        task.isRecurring = false;
        task.recurrenceInterval = undefined;
      }
      await onSubmit(task);

      if (tags.length > 0) await saveTags(tags);

      onOpenChange(false);

      toast({
        title: "Success",
        description:
          mode === "create"
            ? "Task created successfully"
            : "Task updated successfully",
      });

      if (mode === "create") {
        setTitle("");
        setOwner(undefined);
        setDate("");
        setRequiredHours(undefined);
        setFocusLevel(undefined);
        setJoyLevel(undefined);
        setNotes(undefined);
        setTags([]);
        setIsRecurring(false);
        setRecurrenceInterval(undefined);
        setJobComboboxOpen(false);
        if (propJobId) {
          setJobId(propJobId);
        } else {
          setJobId(undefined);
        }
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      toast({
        title: "Error",
        description: "Failed to submit task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Add Task" : "Edit Task"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Title */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>

              {/* Job Selection - Combobox with search */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="job" className="text-right">
                  Job <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3 space-y-2">
                  <Popover open={jobComboboxOpen} onOpenChange={setJobComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={jobComboboxOpen}
                        className="w-full justify-between"
                        onClick={() => setJobError(null)}
                      >
                        {selectedJobTitle || "Select a job..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search jobs..." 
                        />
                        <CommandList>
                          <CommandEmpty>No jobs found.</CommandEmpty>
                          <CommandGroup>
                            {filteredJobs.map(([id, job]: [string, any]) => (
                              <CommandItem
                                key={id}
                                value={job.title}
                                onSelect={(currentValue) => {
                                  setJobId(currentValue === jobId ? undefined : id);
                                  setJobComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    jobId === id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {job.title}
                              </CommandItem>
                            ))}
                            <CommandItem
                              value="Create New Job"
                              onSelect={() => {
                                setIsJobDialogOpen(true);
                                setJobComboboxOpen(false);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Job
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {jobError && (
                    <p className="text-sm text-red-500 mt-1">{jobError}</p>
                  )}
                </div>
              </div>

              {/* Owner */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="owner" className="text-right">
                  Owner
                </Label>
                <div className="col-span-3 space-y-2">
                  {!isCreatingOwner ? (
                    <>
                      <Select
                        value={owner || "none"}
                        onValueChange={(value) => {
                          if (value === "create") {
                            setIsCreatingOwner(true);
                          } else {
                            setOwner(value === "none" ? undefined : value);
                          }
                        }}
                        disabled={isLoadingOwners}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isLoadingOwners
                                ? "Loading owners..."
                                : "Select an owner"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {owners.map((ownerItem) => (
                            <SelectItem
                              key={ownerItem._id}
                              value={ownerItem._id}
                            >
                              {ownerItem.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="create">
                            + Add New Owner
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {ownerError && (
                        <p className="text-sm text-red-500 mt-1">
                          {ownerError}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="New owner name"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            if (!newOwnerName.trim()) return;
                            try {
                              const response = await fetch("/api/owners", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: newOwnerName }),
                              });

                              if (!response.ok)
                                throw new Error("Failed to create owner");

                              const createdOwner = await response.json();
                              setOwners((prev) => [...prev, createdOwner]);
                              setOwner(createdOwner._id);
                              setNewOwnerName("");
                              setIsCreatingOwner(false);
                            } catch (error) {
                              console.error("Error creating owner:", error);
                              setOwnerError(
                                "Failed to create owner. Try again.",
                              );
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCreatingOwner(false);
                            setNewOwnerName("");
                            setOwnerError(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Do Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date || ""}
                  onChange={(e) => setDate(e.target.value)}
                  className="col-span-3"
                />
              </div>

              {/* Hours */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="requiredHours" className="text-right">
                  Hours Required
                </Label>
                <Input
                  id="requiredHours"
                  type="number"
                  min="0"
                  step="any"
                  value={requiredHours === undefined ? "" : requiredHours}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRequiredHours(
                      value === "" ? undefined : parseFloat(value),
                    );
                  }}
                  className="col-span-3"
                />
              </div>

              {/* Focus */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="focusLevel" className="text-right">
                  Focus Level
                </Label>
                <div className="col-span-3">
                  <Select
                    value={focusLevel || "none"}
                    onValueChange={(value) =>
                      value === "none"
                        ? setFocusLevel(undefined)
                        : setFocusLevel(value as FocusLevel)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select focus level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value={FocusLevel.High}>
                        {FocusLevel.High}
                      </SelectItem>
                      <SelectItem value={FocusLevel.Medium}>
                        {FocusLevel.Medium}
                      </SelectItem>
                      <SelectItem value={FocusLevel.Low}>
                        {FocusLevel.Low}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Joy */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="joyLevel" className="text-right">
                  Joy Level
                </Label>
                <div className="col-span-3">
                  <Select
                    value={joyLevel || "none"}
                    onValueChange={(value) =>
                      value === "none"
                        ? setJoyLevel(undefined)
                        : setJoyLevel(value as JoyLevel)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select joy level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value={JoyLevel.High}>
                        {JoyLevel.High}
                      </SelectItem>
                      <SelectItem value={JoyLevel.Medium}>
                        {JoyLevel.Medium}
                      </SelectItem>
                      <SelectItem value={JoyLevel.Low}>
                        {JoyLevel.Low}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tags" className="text-right">
                  Tags
                </Label>
                <div className="col-span-3">
                  <TagInput
                    value={tags}
                    onChange={setTags}
                    placeholder="Add tags (press Enter after each tag)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Enter or comma after each tag, or click Add
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes || ""}
                  onChange={(e) => setNotes(e.target.value || undefined)}
                  className="col-span-3 min-h-[100px]"
                  placeholder="Add any notes for this task..."
                />
              </div>

              {/* Recurring Task */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isRecurring" className="text-right">
                  Recurring Task
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Checkbox
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(!!checked)}
                  />
                  <span className="text-sm">Set as recurring</span>
                </div>
              </div>
              {isRecurring && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="recurrenceInterval" className="text-right">
                    Recurrence Interval
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={recurrenceInterval || "none"}
                      onValueChange={(value) => {
                        setRecurrenceError(null);
                        value === "none"
                          ? setRecurrenceInterval(undefined)
                          : setRecurrenceInterval(value as RecurrenceInterval);
                      }}
                    >
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
                    {recurrenceError && (
                      <p className="text-sm text-red-500 mt-1">{recurrenceError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : mode === "create"
                  ? "Add Task"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Job Dialog for creating a new job */}
      <JobDialog
        mode="create"
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        onSubmit={handleNewJobSubmit}
      />
    </>
  );
}
