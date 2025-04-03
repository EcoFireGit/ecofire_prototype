// components/tasks/tag-input.tsx
"use client";
import React, { useState, KeyboardEvent, useEffect, useRef } from "react";
import { X, ChevronDown, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Tag {
  _id: string;
  name: string;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ value = [], onChange, placeholder = "Add tag...", maxTags = 10 }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { user, isLoaded } = useUser();
  const { toast } = useToast();

  // Fetch available tags when the component mounts
  useEffect(() => {
    if (isLoaded && user) {
      fetchTags();
    }
  }, [isLoaded, user]);
  
  // Add click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/task-tags');
      const result = await response.json();
      
      if (result.success) {
        setAvailableTags(result.data);
      } else {
        console.error('Error fetching tags:', result.error);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Update filtered tags when input changes
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) && 
        !value.includes(tag.name)
      );
      setFilteredTags(filtered);
    } else {
      // When no input, show all available tags (but filter out already selected ones)
      setFilteredTags(availableTags.filter(tag => !value.includes(tag.name)));
    }
  }, [inputValue, availableTags, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add tag when pressing Enter or comma
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  const addTag = (tag: string) => {
    // Don't add if the tag already exists or it's empty
    if (tag.length === 0 || value.includes(tag)) {
      setInputValue("");
      return;
    }

    // Check if we're at the maximum number of tags
    if (value.length >= maxTags) {
      setInputValue("");
      return;
    }

    const newTags = [...value, tag];
    onChange(newTags);
    setInputValue("");
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    
    // Make sure we're passing an empty array, not undefined or null
    onChange(newTags.length > 0 ? newTags : []);
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      // First check if this tag exists in the database
      const response = await fetch(`/api/task-tags/${encodeURIComponent(tagName)}`);
      const result = await response.json();
      
      if (result.success) {
        const tagId = result.data?._id;
        if (tagId) {
          // Delete the tag from the database
          const deleteResponse = await fetch(`/api/task-tags/${tagId}`, {
            method: 'DELETE',
          });
          
          const deleteResult = await deleteResponse.json();
          
          if (deleteResult.success) {
            toast({
              title: "Success",
              description: "Tag deleted successfully",
            });
            
            // Refresh tags list
            fetchTags();
            
            // If the deleted tag was in the current selection, remove it
            if (value.includes(tagName)) {
              removeTag(tagName);
            }
          } else {
            toast({
              title: "Error",
              description: deleteResult.error || "Failed to delete tag",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "Error",
          description: "Tag not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    } finally {
      setTagToDelete(null);
      setIsDeleteDialogOpen(false);
      
      // Ensure the dropdown stays open
      setIsOpen(true);
      
      // Re-focus the input field
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const openDeleteDialog = (tagName: string, e: React.MouseEvent) => {
    // Stop event from bubbling up
    e.stopPropagation();
    e.preventDefault();
    
    // Prevent dropdown from closing
    setIsOpen(true);
    
    // Set the tag to delete and open the dialog
    setTagToDelete(tagName);
    setIsDeleteDialogOpen(true);
  };

  // Function to generate a consistent color for a tag (same as in column definition)
  const getTagColor = (tag: string) => {
    const hashCode = tag.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
   
    const h = Math.abs(hashCode % 360);
    const s = 65 + (hashCode % 20);
    const l = 55 + (hashCode % 15);
   
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            style={{ backgroundColor: getTagColor(tag) }}
            className="text-white border-0 flex items-center gap-1"
          >
            {tag}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent ml-1"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3 text-white" />
              <span className="sr-only">Remove tag {tag}</span>
            </Button>
          </Badge>
        ))}
      </div>
     
      <div className="flex items-center gap-2" ref={wrapperRef}>
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length >= maxTags ? `Maximum ${maxTags} tags reached` : placeholder}
            className="flex-1 pr-10"
            onClick={() => setIsOpen(true)}
            onFocus={() => setIsOpen(true)}
            disabled={value.length >= maxTags}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setIsOpen(!isOpen)}
            disabled={value.length >= maxTags}
          >
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
          
          {/* Dropdown */}
          {isOpen && value.length < maxTags && (
            <div 
              className="absolute top-full left-0 w-full bg-popover z-50 mt-1 rounded-md border shadow-md"
            >
              <div className="py-2">
                {filteredTags.length === 0 && inputValue.trim() === "" ? (
                  <div className="px-2 py-2 text-sm text-center text-muted-foreground">
                    No tags found
                  </div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="p-1">
                    {filteredTags.map((tag) => (
                      <div
                        key={tag._id}
                        className="flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <div 
                          className="flex items-center gap-2 flex-1"
                          onClick={() => addTag(tag.name)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getTagColor(tag.name) }}
                          />
                          {tag.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            openDeleteDialog(tag.name, e);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span className="sr-only">Delete tag {tag.name}</span>
                        </Button>
                      </div>
                    ))}
                    {inputValue.trim() && !availableTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase()) && (
                      <div
                        onClick={() => addTag(inputValue.trim())}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer italic"
                      >
                        Create "{inputValue}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => inputValue.trim() && addTag(inputValue.trim())}
          disabled={!inputValue.trim() || value.length >= maxTags}
          size="sm"
        >
          Add
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{tagToDelete}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTagToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => tagToDelete && handleDeleteTag(tagToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}