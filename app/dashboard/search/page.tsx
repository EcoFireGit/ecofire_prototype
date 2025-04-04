'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchResultCard } from "@/components/search/search-card";
import { TasksSidebar } from "@/components/search/search-sidebar";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog";
import { JobDialog } from "@/components/jobs/job-dialog";

const SearchPage = () => {
  // State for holding the search query and results
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  
  // State for sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
  
  // State for dialogs
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // State for refresh flag
  const [needsRefresh, setNeedsRefresh] = useState(false);
  
  const { toast } = useToast();

  // Function to handle search
  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query!');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Fetch search results from the API
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Check for successful response
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();
      setResults(data.data || []);
    } catch (err) {
      setError('Error fetching search results');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle opening the sidebar
  const handleOpenSidebar = (item: any) => {
    setCurrentItem(item);
    setSidebarOpen(true);
  };

  // Function to handle selection of items
  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedResults);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedResults(newSelected);
  };
  
  // Function to handle editing an item
  const handleEditItem = (item: any) => {
    setEditingItem(item);
    
    if (item.type.toLowerCase() === 'job') {
      setJobDialogOpen(true);
    } else if (item.type.toLowerCase() === 'task') {
      setTaskDialogOpen(true);
    }
  };
  
  // Function to handle updating a task
  const handleTaskSubmit = async (taskData: any) => {
    try {
      const itemId = editingItem?.id || editingItem?._id;
      if (!itemId) return;
      
      // If taskData doesn't have a jobId, add it from the editingItem
      if (!taskData.jobId && editingItem.jobId) {
        taskData.jobId = editingItem.jobId;
      }
      
      const response = await fetch(`/api/tasks/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
        
        // Update the item in results
        setResults(prevResults => 
          prevResults.map(result => 
            (result.id === itemId || result._id === itemId) 
              ? { ...result, ...taskData } 
              : result
          )
        );
        
        // Refresh search results on next search
        setNeedsRefresh(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to update task",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle updating a job
  const handleJobSubmit = async (jobData: any) => {
    try {
      const itemId = editingItem?.id || editingItem?._id;
      if (!itemId) return;
      
      const response = await fetch(`/api/jobs/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
        
        // Update the item in results
        setResults(prevResults => 
          prevResults.map(result => 
            (result.id === itemId || result._id === itemId) 
              ? { ...result, ...jobData } 
              : result
          )
        );
        
        // Refresh search results on next search
        setNeedsRefresh(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to update job",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle deleting an item
  const handleDeleteItem = async (id: string) => {
    try {
      // Find the item type
      const item = results.find(r => r.id === id || r._id === id);
      if (!item) return;
      
      // Make the appropriate API call based on item type
      const endpoint = item.type.toLowerCase() === 'job' 
        ? `/api/jobs/${id}` 
        : `/api/tasks/${id}`;
        
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the item from results
        setResults(results.filter(r => (r.id !== id && r._id !== id)));
        
        // Remove from selected items if selected
        if (selectedResults.has(id)) {
          const newSelected = new Set(selectedResults);
          newSelected.delete(id);
          setSelectedResults(newSelected);
        }
        
        toast({
          title: "Success",
          description: `${item.type} deleted successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete ${item.type}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle sidebar close and refresh
  const handleSidebarChange = (open: boolean) => {
    // If the sidebar is closing and we need to refresh
    if (!open && needsRefresh) {
      handleSearch(); // Refresh search results
      setNeedsRefresh(false);
    }
    setSidebarOpen(open);
  };

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Search</h1>
        </div>
        <div className="search-bar mb-6">
            <input
            type="text"
            placeholder="Search for jobs or tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="bg-gray-100 p-2 rounded-md w-full sm:w-auto" />
            <Button onClick={handleSearch} disabled={loading} className="mt-2 sm:mt-0 sm:ml-2">
            {loading ? 'Searching...' : 'Search'}
            </Button>
        </div>
        {error && <div className="error text-red-500 mb-4">{error}</div>}
        
        {/* Selected count */}
        {selectedResults.size > 0 && (
          <div className="mb-4 p-2 bg-blue-50 rounded-md flex justify-between items-center">
            <span>{selectedResults.size} items selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedResults(new Set())}>
              Clear selection
            </Button>
          </div>
        )}
        
        {/* Search Results */}
        <div className="search-results">
          {results.length > 0 ? (
            <div className="flex flex-col space-y-4">
              {results.map((result, index) => (
                <SearchResultCard 
                  key={result.id || result._id || index}
                  result={result}
                  index={index}
                  onOpenTasksSidebar={handleOpenSidebar}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onSelect={handleSelectItem}
                  isSelected={selectedResults.has(result.id || result._id)}
                  taskOwnerMap={taskOwnerMap}
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              {query.trim() ? "No results found" : "Enter a search term to find items"}
            </p>
          )}
        </div>
        
        {/* Tasks Sidebar */}
        <TasksSidebar
          open={sidebarOpen}
          onOpenChange={handleSidebarChange}
          selectedItem={currentItem}
          onRefreshJobs={() => setNeedsRefresh(true)}
        />
        
        {/* Task Edit Dialog */}
        {editingItem && editingItem.type?.toLowerCase() === 'task' && (
          <TaskDialog
            mode="edit"
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            onSubmit={handleTaskSubmit}
            initialData={editingItem}
            jobId={editingItem.jobId || ''}
          />
        )}
        
        {/* Job Edit Dialog */}
        {editingItem && editingItem.type?.toLowerCase() === 'job' && (
          <JobDialog
            mode="edit"
            open={jobDialogOpen}
            onOpenChange={setJobDialogOpen}
            onSubmit={handleJobSubmit}
            initialData={editingItem}
          />
        )}
      </div>
    </div>
  );
};

export default SearchPage;