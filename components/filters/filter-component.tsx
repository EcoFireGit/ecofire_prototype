"use client";

import React, { useState, useEffect } from "react";
import { FocusLevel, JoyLevel } from "@/lib/models/task.model";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Target,
  Smile,
  Users,
  Briefcase,
  X,
  Tag,
  Heart,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export interface FilterComponentProps {
  onFilterChange: (filters: Record<string, any>) => void;
  businessFunctions?: { id: string; name: string }[];
  owners?: { _id: string; name: string }[];
  tags?: { _id: string; name: string }[];
  initialFilters?: Record<string, any>;
}

const FilterComponent: React.FC<FilterComponentProps> = ({
  onFilterChange,
  businessFunctions = [],
  owners = [],
  tags = [],
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [hoursRange, setHoursRange] = useState<[number, number]>([0, 10]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearchValue, setTagSearchValue] = useState<string>("");
  const [filteredTagOptions, setFilteredTagOptions] =
    useState<{ _id: string; name: string }[]>(tags);
  const [activeWellnessMood, setActiveWellnessMood] = useState<string | null>(
    null
  );
  const { toast } = useToast();

  useEffect(() => {
    const handleTimeFilter = (event: any) => {
      const { minutes } = event.detail;

      // Create filters for tasks that take less than the specified minutes
      const minutesInHours = minutes / 60;
      const timeFilters = { minHours: 0, maxHours: minutesInHours };

      // Show toast notification
      toast({
        title: `⏰ Appointment coming up`,
        description: `Showing tasks that can be completed in less than ${minutes} minutes`,
      });

      // Update active filter state
      setActiveWellnessMood(null); // Clear any wellness filters
      setFilters(timeFilters);
      setHoursRange([0, minutesInHours]);

      // Apply the filters
      onFilterChange(timeFilters);
    };

    // Listen for the custom event
    window.addEventListener("applyTimeFilter", handleTimeFilter);

    // Clean up
    return () => {
      window.removeEventListener("applyTimeFilter", handleTimeFilter);
    };
  }, [onFilterChange, toast]);

  // Also add a check for saved appointment time on component mount
  useEffect(() => {
    const savedTime = sessionStorage.getItem("appointmentTime");

    if (savedTime) {
      try {
        const minutes = parseInt(savedTime);
        const minutesInHours = minutes / 60;
        const timeFilters = { minHours: 0, maxHours: minutesInHours };

        // Apply the saved filters
        setFilters(timeFilters);
        setHoursRange([0, minutesInHours]);

        // Apply the filters
        onFilterChange(timeFilters);

        // Show toast notification
        toast({
          title: `⏰ Appointment coming up`,
          description: `Showing tasks that can be completed in less than ${minutes} minutes`,
        });

        // Clear the saved time
        sessionStorage.removeItem("appointmentTime");
      } catch (error) {
        console.error("Error applying saved time filter:", error);
        sessionStorage.removeItem("appointmentTime");
      }
    }
  }, [onFilterChange, toast]);
  
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);

      // Set hours if they exist in initialFilters
      if (
        initialFilters.minHours !== undefined &&
        initialFilters.maxHours !== undefined
      ) {
        setHoursRange([initialFilters.minHours, initialFilters.maxHours]);
      }

      // Set date if it exists in initialFilters
      if (initialFilters.dueDate) {
        setDate(new Date(initialFilters.dueDate));
      }

      // Set tags if they exist in initialFilters
      if (initialFilters.tags && Array.isArray(initialFilters.tags)) {
        setSelectedTags(initialFilters.tags);
      }
    }
  }, [initialFilters]);

  // Check for saved wellness filters on component mount
  useEffect(() => {
    const savedMood = sessionStorage.getItem("wellnessMood");
    const savedFilters = sessionStorage.getItem("wellnessFilters");

    if (savedMood && savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);

        // Apply the saved filters
        setActiveWellnessMood(savedMood);
        setFilters(parsedFilters);

        // Update hours range if necessary
        if (
          parsedFilters.minHours !== undefined &&
          parsedFilters.maxHours !== undefined
        ) {
          setHoursRange([parsedFilters.minHours, parsedFilters.maxHours]);
        }

        // Apply the filters
        onFilterChange(parsedFilters);

        // Show toast notification
        let moodEmoji = "";
        if (savedMood === "sad") moodEmoji = "😀";
        else if (savedMood === "focused") moodEmoji = "🤓";
        else if (savedMood === "distracted") moodEmoji = "😵‍💫";
        else if (savedMood === "tired") moodEmoji = "😴";

        toast({
          title: `${moodEmoji} Wellness filters applied`,
          description: "Showing tasks based on your mood",
        });

        // Clear the saved filters
        sessionStorage.removeItem("wellnessMood");
        sessionStorage.removeItem("wellnessFilters");
      } catch (error) {
        console.error("Error applying saved wellness filters:", error);
        sessionStorage.removeItem("wellnessMood");
        sessionStorage.removeItem("wellnessFilters");
      }
    }
  }, [onFilterChange, toast]);

  // Set up listener for wellness filter events
  useEffect(() => {
    const handleWellnessFilters = (event: any) => {
      const { filters: wellnessFilters, mood } = event.detail;

      // Show toast notification
      let moodEmoji = "";
      let message = "Showing tasks based on your mood";

      if (mood === "sad") moodEmoji = "😀";
      else if (mood === "focused") moodEmoji = "🤓";
      else if (mood === "distracted") moodEmoji = "😵‍💫";
      else if (mood === "tired") moodEmoji = "😴";

      toast({
        title: `${moodEmoji} Wellness filters applied`,
        description: message,
      });

      // Update filter state
      setActiveWellnessMood(mood);

      // Update the filters to match the wellness selection
      const newFilters = { ...wellnessFilters };
      setFilters(newFilters);

      // Update hours range if necessary
      if (
        newFilters.minHours !== undefined &&
        newFilters.maxHours !== undefined
      ) {
        setHoursRange([newFilters.minHours, newFilters.maxHours]);
      }

      // Apply the filters
      onFilterChange(newFilters);
    };

    // Listen for the custom event
    window.addEventListener("applyWellnessFilters", handleWellnessFilters);

    // Clean up
    return () => {
      window.removeEventListener("applyWellnessFilters", handleWellnessFilters);
    };
  }, [onFilterChange, toast]);

  // Filter tags based on search input
  useEffect(() => {
    if (tags.length > 0) {
      if (tagSearchValue.trim() === "") {
        setFilteredTagOptions(tags);
      } else {
        const filtered = tags.filter((tag) =>
          tag.name.toLowerCase().includes(tagSearchValue.toLowerCase())
        );
        setFilteredTagOptions(filtered);
      }
    }
  }, [tagSearchValue, tags]);

  // Initialize filtered tag options with all tags
  useEffect(() => {
    setFilteredTagOptions(tags);
  }, [tags]);

  const handleFilterChange = (key: string, value: any) => {
    // Clear active wellness mood when filters are manually changed
    setActiveWellnessMood(null);

    const newFilters = { ...filters };

    if (value === null || value === undefined || value === "any") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleHoursChange = (value: [number, number]) => {
    // Clear active wellness mood when filters are manually changed
    setActiveWellnessMood(null);

    setHoursRange(value);
    const newFilters = { ...filters };
    newFilters.minHours = value[0];
    newFilters.maxHours = value[1];
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (date: Date | undefined) => {
    // Clear active wellness mood when filters are manually changed
    setActiveWellnessMood(null);

    setDate(date);
    const newFilters = { ...filters };

    if (date) {
      newFilters.dueDate = date.toISOString();
    } else {
      delete newFilters.dueDate;
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleTagToggle = (tagId: string) => {
    // Clear active wellness mood when filters are manually changed
    setActiveWellnessMood(null);

    let newSelectedTags;

    if (selectedTags.includes(tagId)) {
      // Remove tag if already selected
      newSelectedTags = selectedTags.filter((id) => id !== tagId);
    } else {
      // Add tag if not already selected
      newSelectedTags = [...selectedTags, tagId];
    }

    setSelectedTags(newSelectedTags);

    const newFilters = { ...filters };
    if (newSelectedTags.length > 0) {
      newFilters.tags = newSelectedTags;
    } else {
      delete newFilters.tags;
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const removeTag = (tagId: string) => {
    // Clear active wellness mood when filters are manually changed
    setActiveWellnessMood(null);

    const newSelectedTags = selectedTags.filter((id) => id !== tagId);
    setSelectedTags(newSelectedTags);

    const newFilters = { ...filters };
    if (newSelectedTags.length > 0) {
      newFilters.tags = newSelectedTags;
    } else {
      delete newFilters.tags;
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Helper function to get business function name by ID
  const getBusinessFunctionName = (id: string) => {
    const bf = businessFunctions.find((bf) => bf.id === id);
    return bf ? bf.name : id;
  };

  // Helper function to get owner name by ID
  const getOwnerName = (id: string) => {
    const owner = owners.find((owner) => owner._id === id);
    return owner ? owner.name : id;
  };

  // Helper function to get tag name by ID
  const getTagName = (id: string) => {
    const tag = tags.find((tag) => tag._id === id);
    return tag ? tag.name : id;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Display active wellness mode if selected */}
      {activeWellnessMood && (
        <Badge className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1 h-10 hover:bg-purple-200">
          <Heart className="h-4 w-4 text-purple-500 fill-purple-500" />
          <span className="font-medium">
            {activeWellnessMood === "sad" && "Happy mood - High joy tasks"}
            {activeWellnessMood === "focused" &&
              "Focused mood - High focus tasks"}
            {activeWellnessMood === "distracted" &&
              "Distracted mood - High joy & low focus tasks"}
            {activeWellnessMood === "tired" &&
              "Tired mood - Low focus & low joy tasks"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 ml-1 rounded-full hover:bg-purple-200"
            onClick={() => {
              setActiveWellnessMood(null);
              setFilters({});
              setHoursRange([0, 10]);
              onFilterChange({});
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {/* Hours Required Filter */}
      <Popover>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              variant={
                filters.minHours !== undefined && filters.maxHours !== undefined
                  ? "default"
                  : "outline"
              }
              size="sm"
              className="h-10 gap-1"
            >
              <Clock className="h-4 w-4" />
              <span>
                {filters.minHours !== undefined &&
                filters.maxHours !== undefined
                  ? `${filters.minHours} - ${filters.maxHours}h`
                  : "Hours Req."}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {filters.minHours !== undefined && filters.maxHours !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setHoursRange([0, 10]);
                const newFilters = { ...filters };
                delete newFilters.minHours;
                delete newFilters.maxHours;
                setFilters(newFilters);
                onFilterChange(newFilters);
                setActiveWellnessMood(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-80 p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">Hours Required</h4>
              <span className="text-sm text-muted-foreground">
                {hoursRange[0]} - {hoursRange[1]}h
              </span>
            </div>
            <Slider
              min={0}
              max={20}
              step={0.5}
              value={hoursRange}
              onValueChange={(value) =>
                setHoursRange(value as [number, number])
              }
              onValueCommit={handleHoursChange}
              className="mt-6"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0h</span>
              <span>20h</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Focus Level Filter */}
      <Popover>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              variant={filters.focusLevel ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1"
            >
              <Target className="h-4 w-4" />
              <span>{filters.focusLevel || "Focus"}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {filters.focusLevel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                handleFilterChange("focusLevel", null);
                setActiveWellnessMood(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-56 p-2">
          <div className="flex flex-col">
            <Button
              variant={filters.focusLevel === "High" ? "default" : "ghost"}
              size="sm"
              className="justify-start mb-1"
              onClick={() =>
                handleFilterChange(
                  "focusLevel",
                  filters.focusLevel === "High" ? null : "High"
                )
              }
            >
              High
            </Button>
            <Button
              variant={filters.focusLevel === "Medium" ? "default" : "ghost"}
              size="sm"
              className="justify-start mb-1"
              onClick={() =>
                handleFilterChange(
                  "focusLevel",
                  filters.focusLevel === "Medium" ? null : "Medium"
                )
              }
            >
              Medium
            </Button>
            <Button
              variant={filters.focusLevel === "Low" ? "default" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() =>
                handleFilterChange(
                  "focusLevel",
                  filters.focusLevel === "Low" ? null : "Low"
                )
              }
            >
              Low
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Joy Level Filter */}
      <Popover>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              variant={filters.joyLevel ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1"
            >
              <Smile className="h-4 w-4" />
              <span>{filters.joyLevel || "Joy"}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {filters.joyLevel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                handleFilterChange("joyLevel", null);
                setActiveWellnessMood(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-56 p-2">
          <div className="flex flex-col">
            <Button
              variant={filters.joyLevel === "High" ? "default" : "ghost"}
              size="sm"
              className="justify-start mb-1"
              onClick={() =>
                handleFilterChange(
                  "joyLevel",
                  filters.joyLevel === "High" ? null : "High"
                )
              }
            >
              High
            </Button>
            <Button
              variant={filters.joyLevel === "Medium" ? "default" : "ghost"}
              size="sm"
              className="justify-start mb-1"
              onClick={() =>
                handleFilterChange(
                  "joyLevel",
                  filters.joyLevel === "Medium" ? null : "Medium"
                )
              }
            >
              Medium
            </Button>
            <Button
              variant={filters.joyLevel === "Low" ? "default" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() =>
                handleFilterChange(
                  "joyLevel",
                  filters.joyLevel === "Low" ? null : "Low"
                )
              }
            >
              Low
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Business Function Filter */}
      <Popover>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              variant={filters.businessFunctionId ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1"
            >
              <Briefcase className="h-4 w-4" />
              <span>
                {filters.businessFunctionId
                  ? getBusinessFunctionName(filters.businessFunctionId)
                  : "Business Func."}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {filters.businessFunctionId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                handleFilterChange("businessFunctionId", null);
                setActiveWellnessMood(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-56 p-2">
          <div className="flex flex-col max-h-72 overflow-y-auto">
            {businessFunctions.map((bf) => (
              <Button
                key={bf.id}
                variant={
                  filters.businessFunctionId === bf.id ? "default" : "ghost"
                }
                size="sm"
                className="justify-start mb-1"
                onClick={() =>
                  handleFilterChange(
                    "businessFunctionId",
                    filters.businessFunctionId === bf.id ? null : bf.id
                  )
                }
              >
                {bf.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Owner Filter */}
      <Popover>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              variant={filters.owner ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1"
            >
              <Users className="h-4 w-4" />
              <span>
                {filters.owner ? getOwnerName(filters.owner) : "Owner"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {filters.owner && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                handleFilterChange("owner", null);
                setActiveWellnessMood(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-56 p-2">
          <div className="flex flex-col max-h-72 overflow-y-auto">
            {owners.map((owner) => (
              <Button
                key={owner._id}
                variant={filters.owner === owner._id ? "default" : "ghost"}
                size="sm"
                className="justify-start mb-1"
                onClick={() =>
                  handleFilterChange(
                    "owner",
                    filters.owner === owner._id ? null : owner._id
                  )
                }
              >
                {owner.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Tags Filter */}
      <Popover>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              variant={selectedTags.length > 0 ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1"
            >
              <Tag className="h-4 w-4" />
              <span>
                {selectedTags.length > 0
                  ? `${selectedTags.length} Tag${
                      selectedTags.length > 1 ? "s" : ""
                    }`
                  : "Tags"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTags([]);
                const newFilters = { ...filters };
                delete newFilters.tags;
                setFilters(newFilters);
                onFilterChange(newFilters);
                setActiveWellnessMood(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Select Tags</h4>

            {/* Search input */}
            <div className="relative">
              <Input
                placeholder="Search tags..."
                value={tagSearchValue}
                onChange={(e) => setTagSearchValue(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Show selected tags as badges */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedTags.map((tagId) => (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {getTagName(tagId)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 rounded-full hover:bg-muted"
                      onClick={() => removeTag(tagId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag selection list */}
            <div className="flex flex-col max-h-72 overflow-y-auto space-y-2">
              {filteredTagOptions.length > 0 ? (
                filteredTagOptions.map((tag) => (
                  <div key={tag._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag._id}`}
                      checked={selectedTags.includes(tag._id)}
                      onCheckedChange={() => handleTagToggle(tag._id)}
                    />
                    <label
                      htmlFor={`tag-${tag._id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {tag.name}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tagSearchValue
                    ? "No matching tags found"
                    : "No tags available"}
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Due Date Filter -- commenting for now, todo: fix*/}
      {/* <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 gap-1 bg-gray-100">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span>
              {filters.dueDate 
                ? `Due: ${format(new Date(filters.dueDate), 'MMM d')}` 
                : "Due Date"}
            </span>
            {filters.dueDate ? (
              <X 
                className="h-4 w-4 ml-1 hover:text-destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(undefined);
                  handleFilterChange('dueDate', null);
                }}
              />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover> */}

      {/* Clear All Filters Button - Only show if filters are applied */}
      {Object.keys(filters).length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => {
            setFilters({});
            setHoursRange([0, 10]);
            setDate(undefined);
            setSelectedTags([]);
            setTagSearchValue("");
            setActiveWellnessMood(null);
            onFilterChange({});
          }}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};

export default FilterComponent;
