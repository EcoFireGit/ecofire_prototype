'use client';

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchResultCard } from "@/components/search/search-card";
import { TasksSidebar } from "@/components/search/search-sidebar";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog";
import { JobDialog } from "@/components/jobs/job-dialog";

const SearchPage = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const { toast } = useToast();

  // Fetch search results on query change
  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }
        const data = await response.json();
        setResults(data.data || []);
      } catch (err) {
        setError('Error fetching search results');
        setResults([]);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query, needsRefresh]); // also refetch if needsRefresh changes

  // ...other handlers unchanged...

  const handleOpenSidebar = (item: any) => {
    setCurrentItem(item);
    setSidebarOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    if (item.type?.toLowerCase() === 'job') {
      setJobDialogOpen(true);
    } else if (item.type?.toLowerCase() === 'task') {
      setTaskDialogOpen(true);
    }
  };

  const handleTaskSubmit = async (taskData: any) => {
    try {
      const itemId = editingItem?.id || editingItem?._id;
      if (!itemId) return;
      if (!taskData.jobId && editingItem.jobId) {
        taskData.jobId = editingItem.jobId;
      }
      const response = await fetch(`/api/tasks/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Success", description: "Task updated successfully" });
        setNeedsRefresh(n => !n); // trigger refetch
      } else {
        toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  const handleJobSubmit = async (jobData: any) => {
    try {
      const itemId = editingItem?.id || editingItem?._id;
      if (!itemId) return;
      const response = await fetch(`/api/jobs/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Success", description: "Job updated successfully" });
        setNeedsRefresh(n => !n); // trigger refetch
      } else {
        toast({ title: "Error", description: "Failed to update job", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating job:", error);
      toast({ title: "Error", description: "Failed to update job", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const item = results.find(r => r.id === id || r._id === id);
      if (!item) return;
      const endpoint = item.type?.toLowerCase() === 'job'
        ? `/api/jobs/${id}`
        : `/api/tasks/${id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setResults(results.filter(r => (r.id !== id && r._id !== id)));
        if (selectedResults.has(id)) {
          const newSelected = new Set(selectedResults);
          newSelected.delete(id);
          setSelectedResults(newSelected);
        }
        toast({ title: "Success", description: `${item.type} deleted successfully` });
      } else {
        toast({ title: "Error", description: `Failed to delete ${item.type}`, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  };

  const handleSidebarChange = (open: boolean) => {
    if (!open && needsRefresh) {
      setNeedsRefresh(n => !n); // trigger refetch
    }
    setSidebarOpen(open);
  };

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-2xl font-bold text-center">Search</h1>
        </div>
        {error && <div className="error text-red-500 mb-4">{error}</div>}

        {selectedResults.size > 0 && (
          <div className="mb-4 p-2 bg-blue-50 rounded-md flex justify-between items-center">
            <span>{selectedResults.size} items selected</span>
            <button
              className="text-sm px-2 py-1 border rounded border-gray-300"
              onClick={() => setSelectedResults(new Set())}
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Search Results */}
        <div className="search-results">
          {loading ? (
            <p className="text-center py-8 text-gray-500">Searching...</p>
          ) : results.length > 0 ? (
            <div className="flex justify-center">
  <div className="flex flex-col space-y-4 ml-48">
              {results.map((result, index) => (
                <SearchResultCard
                  key={result.id || result._id || index}
                  result={result}
                  index={index}
                  onOpenTasksSidebar={handleOpenSidebar}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  isSelected={selectedResults.has(result.id || result._id)}
                  taskOwnerMap={taskOwnerMap}
                />
              ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              {query.trim() ? "No results found" : "Type in the search bar above to find items"}
            </p>
          )}
        </div>

        {/* Tasks Sidebar */}
        <TasksSidebar
          open={sidebarOpen}
          onOpenChange={handleSidebarChange}
          selectedItem={currentItem}
          onRefreshJobs={() => setNeedsRefresh(n => !n)}
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