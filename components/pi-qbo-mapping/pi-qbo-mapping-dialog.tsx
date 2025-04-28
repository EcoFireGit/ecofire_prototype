
// components/pi-qbo-mapping/pi-qbo-mapping-dialog.tsx
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
import { useState, useEffect, useRef } from "react";
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
  mode: "create" | "edit";
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
  qbosList,
}: PIQBOMappingDialogProps) {
  const [piSearchTerm, setPISearchTerm] = useState("");
  const [qboSearchTerm, setQBOSearchTerm] = useState("");
  const [piDropdownOpen, setPIDropdownOpen] = useState(false);
  const [qboDropdownOpen, setQBODropdownOpen] = useState(false);
  const [filteredPIs, setFilteredPIs] = useState(pisList);
  const [filteredQBOs, setFilteredQBOs] = useState(qbosList);
  const [formValid, setFormValid] = useState(false);
  const piWrapperRef = useRef<HTMLDivElement>(null);
  const qboWrapperRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<MappingFormData>(() => {
    if (initialData) {
      return {
        id: initialData._id,
        piId: initialData.piId,
        qboId: initialData.qboId,
        piTarget: initialData.piTarget,
        qboTarget: initialData.qboTarget,
        qboImpact: initialData.qboImpact,
        notes: initialData.notes,
      };
    }
    return {
      piId: "",
      qboId: "",
      piTarget: undefined,
      qboTarget: undefined,
      qboImpact: undefined,
      notes: "",
    };
  });

  // Check if form is valid
  useEffect(() => {
    // Check if required fields are filled
    const isValid =
      Boolean(formData.piId) && // PI is selected
      Boolean(formData.qboId) && // QBO is selected
      formData.qboImpact !== undefined; // QBO Impact is entered

    setFormValid(isValid);
  }, [formData]);

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

  // Filter QBOs based on search term
  useEffect(() => {
    if (qboSearchTerm.trim() === "") {
      setFilteredQBOs(qbosList);
    } else {
      const filtered = qbosList.filter((qbo) =>
        qbo.name.toLowerCase().includes(qboSearchTerm.toLowerCase()),
      );
      setFilteredQBOs(filtered);
    }
  }, [qboSearchTerm, qbosList]);

  // Handle clicks outside the dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        piWrapperRef.current &&
        !piWrapperRef.current.contains(event.target as Node)
      ) {
        setPIDropdownOpen(false);
      }
      if (
        qboWrapperRef.current &&
        !qboWrapperRef.current.contains(event.target as Node)
      ) {
        setQBODropdownOpen(false);
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
        id: initialData._id,
        piId: initialData.piId,
        qboId: initialData.qboId,
        piTarget: initialData.piTarget,
        qboTarget: initialData.qboTarget,
        qboImpact: initialData.qboImpact,
        notes: initialData.notes,
      });
      
      // Set search terms based on selected items
      const selectedPI = pisList.find(pi => pi._id === initialData.piId);
      const selectedQBO = qbosList.find(qbo => qbo._id === initialData.qboId);
      
      setPISearchTerm(selectedPI ? selectedPI.name : "");
      setQBOSearchTerm(selectedQBO ? selectedQBO.name : "");
    } else {
      setFormData({
        piId: "",
        qboId: "",
        piTarget: undefined,
        qboTarget: undefined,
        qboImpact: undefined,
        notes: "",
      });
      
      // Clear search terms
      setPISearchTerm("");
      setQBOSearchTerm("");
    }
  }, [initialData, open, pisList, qbosList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const handlePIChange = (piId: string) => {
    const selectedPI = pisList.find((pi) => pi._id === piId);

    setFormData({
      ...formData,
      piId,
      piTarget: selectedPI ? selectedPI.targetValue : undefined,
    });
    
    // Update the search input with the selected PI name
    if (selectedPI) {
      setPISearchTerm(selectedPI.name);
    }
  };

  const handleQBOChange = (qboId: string) => {
    const selectedQBO = qbosList.find((qbo) => qbo._id === qboId);

    setFormData({
      ...formData,
      qboId,
      qboTarget: selectedQBO ? selectedQBO.targetValue : undefined,
    });
    
    // Update the search input with the selected QBO name
    if (selectedQBO) {
      setQBOSearchTerm(selectedQBO.name);
    }
  };

  const handleNumberChange = (field: keyof MappingFormData, value: string) => {
    const numValue = value === "" ? undefined : Number(value);
    setFormData({ ...formData, [field]: numValue });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? "Map Output to Outcome"
                : "Edit Output-Outcome Mapping"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <Label htmlFor="piId" className="text-left">
                Output name <span className="text-red-500">*</span>
              </Label>
              <div className="relative" ref={piWrapperRef}>
                <Input
                  placeholder="Search for an Output..."
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
                          No outputs found
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
              <Label htmlFor="qboId" className="text-left">
                Outcome name <span className="text-red-500">*</span>
              </Label>
              <div className="relative" ref={qboWrapperRef}>
                <Input
                  placeholder="Search for an Outcome..."
                  value={qboSearchTerm}
                  onChange={(e) => setQBOSearchTerm(e.target.value)}
                  onClick={() => setQBODropdownOpen(true)}
                  onFocus={() => setQBODropdownOpen(true)}
                />
                {qboDropdownOpen && (
                  <div className="absolute top-full left-0 w-full bg-popover z-50 mt-1 rounded-md border shadow-md">
                    <div className="py-2">
                      {filteredQBOs.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-center text-muted-foreground">
                          No outcomes found
                        </div>
                      ) : (
                        <div
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                          className="p-1"
                        >
                          {filteredQBOs.map((qbo) => (
                            <div
                              key={qbo._id}
                              className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              onClick={() => {
                                handleQBOChange(qbo._id);
                                setQBODropdownOpen(false);
                              }}
                            >
                              {qbo.name}
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
              <Label htmlFor="qboTarget" className="text-left">
                Outcome Target
              </Label>
              <Input
                id="qboTarget"
                type="number"
                value={
                  formData.qboTarget === undefined ? "" : formData.qboTarget
                }
                onChange={(e) =>
                  handleNumberChange("qboTarget", e.target.value)
                }
                placeholder="0"
                readOnly
                className="bg-gray-100"
              />
              <span className="text-xs text-gray-500">
                Automatically computed
              </span>
            </div>

            <div className="grid items-center gap-2">
              <Label htmlFor="qboImpact" className="text-left">
                Outcome Impact <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qboImpact"
                type="number"
                value={
                  formData.qboImpact === undefined ? "" : formData.qboImpact
                }
                onChange={(e) =>
                  handleNumberChange("qboImpact", e.target.value)
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
              {mode === "create" ? "Map Output to Outcome" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
