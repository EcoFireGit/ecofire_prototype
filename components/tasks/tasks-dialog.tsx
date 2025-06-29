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
import { Task, FocusLevel, JoyLevel } from "./types";
import { TagInput } from "@/components/tasks/tag-input";
import { saveTags } from "@/lib/services/task-tags.service";

// Define Owner interface to match MongoDB document
interface Owner {
  _id: string;
  name: string;
  userId: string;
}

interface TaskDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Partial<Task>) => void;
  initialData?: Task;
  jobId: string;
}

export function TaskDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  initialData,
  jobId,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<string>(""); // always a string

  const [requiredHours, setRequiredHours] = useState<number | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<FocusLevel | undefined>(undefined);
  const [joyLevel, setJoyLevel] = useState<JoyLevel | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // New owner creation
  const [isCreatingOwner, setIsCreatingOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");

  useEffect(() => {
    const fetchOwners = async () => {
      setIsLoadingOwners(true);
      setOwnerError(null);
      try {
        const response = await fetch("/api/owners");
        if (!response.ok) throw new Error(`Failed to fetch owners: ${response.status}`);
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
    if (mode === "create") {
      setTitle("");
      setOwner(undefined);
      setDate(""); // use empty string
      setRequiredHours(undefined);
      setFocusLevel(undefined);
      setJoyLevel(undefined);
      setNotes(undefined);
      setTags([]);
    } else if (initialData) {
      setTitle(initialData.title);
      setOwner(initialData.owner);
      if (initialData.date) {
        setDate(new Date(initialData.date).toISOString().split("T")[0]);
      } else {
        setDate(""); // use empty string
      }
      setRequiredHours(initialData.requiredHours);
      setFocusLevel(initialData.focusLevel);
      setJoyLevel(initialData.joyLevel);
      setNotes(initialData.notes);
      setTags(initialData.tags || []);
    }
  }, [mode, initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const task: Partial<Task> = { title, jobId };
      if (owner) task.owner = owner;
      if (date) {
        task.date = `${date}T00:00:00.000Z`;
      } else {
        task.date = ""; // Explicitly clear the date!
      }
      if (requiredHours !== undefined) task.requiredHours = requiredHours;
      if (focusLevel) task.focusLevel = focusLevel;
      if (joyLevel) task.joyLevel = joyLevel;
      if (notes) task.notes = notes;
      if (tags.length > 0) task.tags = tags;

      await onSubmit(task);
      if (tags.length > 0) await saveTags(tags);
      onOpenChange(false);

      if (mode === "create") {
        setTitle("");
        setOwner(undefined);
        setDate("");
        setRequiredHours(undefined);
        setFocusLevel(undefined);
        setJoyLevel(undefined);
        setNotes(undefined);
        setTags([]);
      }
    } catch (error) {
      console.error("Error submitting task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            {/* Owner */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="owner" className="text-right">Owner</Label>
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
                        <SelectValue placeholder={isLoadingOwners ? "Loading owners..." : "Select an owner"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {owners.map((ownerItem) => (
                          <SelectItem key={ownerItem._id} value={ownerItem._id}>
                            {ownerItem.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="create">+ Add New Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    {ownerError && (
                      <p className="text-sm text-red-500 mt-1">{ownerError}</p>
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

                            if (!response.ok) throw new Error("Failed to create owner");

                            const createdOwner = await response.json();
                            setOwners((prev) => [...prev, createdOwner]);
                            setOwner(createdOwner._id);
                            setNewOwnerName("");
                            setIsCreatingOwner(false);
                          } catch (error) {
                            console.error("Error creating owner:", error);
                            setOwnerError("Failed to create owner. Try again.");
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
              <Label htmlFor="date" className="text-right">Do Date</Label>
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
              <Label htmlFor="requiredHours" className="text-right">Hours Required</Label>
              <Input
                id="requiredHours"
                type="number"
                min="0"
                step="any"
                value={requiredHours === undefined ? "" : requiredHours}
                onChange={(e) => {
                  const value = e.target.value;
                  setRequiredHours(value === "" ? undefined : parseFloat(value));
                }}
                className="col-span-3"
              />
            </div>

            {/* Focus */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="focusLevel" className="text-right">Focus Level</Label>
              <div className="col-span-3">
                <Select
                  value={focusLevel || "none"}
                  onValueChange={(value) =>
                    value === "none" ? setFocusLevel(undefined) : setFocusLevel(value as FocusLevel)
                  }
                >
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
                <Select
                  value={joyLevel || "none"}
                  onValueChange={(value) =>
                    value === "none" ? setJoyLevel(undefined) : setJoyLevel(value as JoyLevel)
                  }
                >
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
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Textarea
                id="notes"
                value={notes || ""}
                onChange={(e) => setNotes(e.target.value || undefined)}
                className="col-span-3 min-h-[100px]"
                placeholder="Add any notes for this task..."
              />
            </div>
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
  );
}