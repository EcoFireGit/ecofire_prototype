// components/pis/pi-dialog.tsx

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
import { useState, useEffect, useRef } from "react";
import { MappingJP } from "./table/columns";
import { Job } from "@/components/jobs/table/columns";
import { PI } from "@/components/pis/table/columns";

interface MappingDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mapping: Partial<MappingJP>) => void;
  initialData?: MappingJP;
  pisList?: any[];
  jobsList?: any[];
}

export function MappingDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  initialData,
  pisList = [],
  jobsList = [],
}: MappingDialogProps) {
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  const [piSearchTerm, setPISearchTerm] = useState("");
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
  const [piDropdownOpen, setPIDropdownOpen] = useState(false);
  const [filteredJobs, setFilteredJobs] = useState(jobsList);
  const [filteredPIs, setFilteredPIs] = useState(pisList);
  const [formValid, setFormValid] = useState(false);
  const jobWrapperRef = useRef<HTMLDivElement>(null);
  const piWrapperRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<MappingJP>>(() => {
    if (initialData) {
      return {
        id: initialData.id,
        jobId: initialData.jobId || "",
        jobName: initialData.jobName || "",
        piId: initialData.piId || "",
        piName: initialData.piName || "",
        piImpactValue: initialData.piImpactValue,
        piTarget: initialData.piTarget,
        notes: initialData.notes || "",
      };
    }
    return {
      jobId: "",
      jobName: "",
      piId: "",
      piName: "",
      piImpactValue: undefined,
      piTarget: undefined,
      notes: "",
    };
  });

  // Check if form is valid
  useEffect(() => {
    // Check if required fields are filled
    const isValid =
      Boolean(formData.piId) && // PI is selected
      Boolean(formData.jobId) && // Job is selected
      formData.piImpactValue !== undefined; // PI Impact is entered

    setFormValid(isValid);
  }, [formData]);

  // Filter jobs based on search term
  useEffect(() => {
    if (jobSearchTerm.trim() === "") {
      setFilteredJobs(jobsList);
    } else {
      const filtered = jobsList.filter((job) =>
        job.title.toLowerCase().includes(jobSearchTerm.toLowerCase()),
      );
      setFilteredJobs(filtered);
    }
  }, [jobSearchTerm, jobsList]);

  // Filter PIs based on search term
  useEffect(() => {
    if (piSearchTerm.trim() === "") {
      setFilteredPIs(pisList);
    } else {
      const filtered = pisList.filter((pi) =>
        pi.name.toLowerCase().includes(piSearchTerm.toLowerCase()),
      );
      setFilteredPIs(filtered);
    }
  }, [piSearchTerm, pisList]);

  // Handle clicks outside the dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        jobWrapperRef.current &&
        !jobWrapperRef.current.contains(event.target as Node)
      ) {
        setJobDropdownOpen(false);
      }
      if (
        piWrapperRef.current &&
        !piWrapperRef.current.contains(event.target as Node)
      ) {
        setPIDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset the form when the dialog opens or the initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        jobId: initialData.jobId || "",
        jobName: initialData.jobName || "",
        piId: initialData.piId || "",
        piName: initialData.piName || "",
        piImpactValue: initialData.piImpactValue,
        piTarget: initialData.piTarget,
        notes: initialData.notes || "",
      });

      // Update search terms with existing values
      setJobSearchTerm(initialData.jobName || "");
      setPISearchTerm(initialData.piName || "");
    } else {
      setFormData({
        jobId: "",
        jobName: "",
        piId: "",
        piName: "",
        piImpactValue: undefined,
        piTarget: undefined,
        notes: "",
      });

      // Clear search terms
      setJobSearchTerm("");
      setPISearchTerm("");
    }
  }, [initialData, open]);

  useEffect(() => {
    console.log("formData updated:", formData);
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a copy of the form data for submission
    const submissionData = { ...formData };

    // Submit the data to the parent component
    onSubmit(submissionData);

    // Close the dialog
    onOpenChange(false);
  };

  const handlePIChange = (piId: string) => {
    const selectedPI = pisList.find((pi) => pi._id === piId);

    setFormData({
      ...formData,
      piId,
      piName: selectedPI ? selectedPI.name : "",
      piTarget: selectedPI ? selectedPI.targetValue : undefined,
    });

    // Update the search input with the selected PI name
    if (selectedPI) {
      setPISearchTerm(selectedPI.name);
    }
  };

  const handleJobChange = (jobId: string) => {
    const selectedJob = jobsList.find((job) => job._id === jobId);

    setFormData({
      ...formData,
      jobId,
      jobName: selectedJob ? selectedJob.title : "",
    });

    // Update the search input with the selected job title
    if (selectedJob) {
      setJobSearchTerm(selectedJob.title);
    }
  };

  const handleNumberChange = (field: keyof MappingJP, value: string) => {
    const numValue = value === "" ? undefined : Number(value);
    setFormData({ ...formData, [field]: numValue });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add Mapping" : "Edit Mapping"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <div className="grid items-center gap-2">
                <Label htmlFor="jobId" className="text-left">
                  Job name <span className="text-red-500">*</span>
                </Label>
                <div className="relative" ref={jobWrapperRef}>
                  <Input
                    placeholder="Search for a job..."
                    value={jobSearchTerm}
                    onChange={(e) => setJobSearchTerm(e.target.value)}
                    onClick={() => setJobDropdownOpen(true)}
                    onFocus={() => setJobDropdownOpen(true)}
                  />
                  {jobDropdownOpen && (
                    <div className="absolute top-full left-0 w-full bg-popover z-50 mt-1 rounded-md border shadow-md">
                      <div className="py-2">
                        {filteredJobs.length === 0 ? (
                          <div className="px-2 py-2 text-sm text-center text-muted-foreground">
                            No jobs found
                          </div>
                        ) : (
                          <div
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                            className="p-1"
                          >
                            {filteredJobs.map((job) => (
                              <div
                                key={job._id}
                                className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={() => {
                                  handleJobChange(job._id);
                                  setJobDropdownOpen(false);
                                  setJobSearchTerm(job.title);
                                }}
                              >
                                {job.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Label htmlFor="piId" className="text-left">
                Output name <span className="text-red-500">*</span>
              </Label>
              <div className="relative" ref={piWrapperRef}>
                <Input
                  placeholder="Search for a PI..."
                  value={piSearchTerm}
                  onChange={(e) => setPISearchTerm(e.target.value)}
                  onClick={() => setPIDropdownOpen(true)}
                  onFocus={() => setPIDropdownOpen(true)}
                />
                {piDropdownOpen && (
                  <div className="absolute top-full left-0 w-full bg-popover z-50 mt-1 rounded-md border shadow-md">
                    <div className="py-2">
                      {filteredPIs.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-center text-muted-foreground">
                          No PIs found
                        </div>
                      ) : (
                        <div
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                          className="p-1"
                        >
                          {filteredPIs.map((pi) => (
                            <div
                              key={pi._id}
                              className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              onClick={() => {
                                handlePIChange(pi._id);
                                setPIDropdownOpen(false);
                                setPISearchTerm(pi.name);
                              }}
                            >
                              {pi.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid items-center gap-2">
              <Label htmlFor="piTarget" className="text-left">
                Output Target
              </Label>
              <Input
                id="piTarget"
                type="number"
                value={formData.piTarget === undefined ? "" : formData.piTarget}
                onChange={(e) => handleNumberChange("piTarget", e.target.value)}
                placeholder="0"
                readOnly
                className="bg-gray-100"
              />
              <span className="text-xs text-gray-500">
                Automatically computed
              </span>
            </div>

            <div className="grid items-center gap-2">
              <Label htmlFor="piImpactValue" className="text-left">
                Output Impact <span className="text-red-500">*</span>
              </Label>
              <Input
                id="piImpactValue"
                type="number"
                value={
                  formData.piImpactValue === undefined
                    ? ""
                    : formData.piImpactValue
                }
                onChange={(e) =>
                  handleNumberChange("piImpactValue", e.target.value)
                }
                placeholder="0"
                required
              />
            </div>

            <div className="grid items-center gap-2">
              <Label htmlFor="notes" className="text-left">
                Mapping notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Enter value"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600"
              disabled={!formValid}
            >
              {mode === "create" ? "Map" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
