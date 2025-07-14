'use client';

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchResultCard } from "@/components/search/search-card";
import { TaskDetailsSidebar } from "@/components/tasks/task-details-sidebar";
import { TasksSidebar } from "@/components/tasks/tasks-sidebar";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/tasks/tasks-dialog-jobselector";
import { JobDialog } from "@/components/jobs/job-dialog";
import { Task } from "@/components/tasks/types";

const SearchPage = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [jobs, setJobs] = useState<Record<string, any>>({});

  const { toast } = useToast();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch("/api/jobs");
        const result = await response.json();
        
        if (result.success) {
          const jobsMap: Record<string, any> = {};
          result.data.forEach((job: any) => {
            if (job._id) {
              jobsMap[job._id] = job;
            }
          });
          setJobs(jobsMap);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };

    fetchJobs();
  }, []);

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
  }, [query, needsRefresh]);

  const handleOpenSidebar = (item: any) => {
    if (item.type?.toLowerCase() === 'task') {
      const formattedTask: Task = {
        id: item._id || item.id,
        title: item.title,
        owner: item.owner,
        date: item.date,
        requiredHours: item.requiredHours,
        focusLevel: item.focusLevel,
        joyLevel: item.joyLevel,
        notes: item.notes,
        tags: item.tags || [],
        jobId: item.jobId,
        completed: item.completed,
        isNextTask: false,
      };
      
      setCurrentItem(formattedTask);
      setSidebarOpen(true);
    } else if (item.type?.toLowerCase() === 'job') {
      const formattedJob = {
        id: item._id || item.id,
        title: item.title,
        jobNumber: item.jobNumber,
        businessFunctionName: item.businessFunctionName,
        businessFunctionId: item.businessFunctionId,
        dueDate: item.dueDate,
        notes: item.notes,
        tasks: item.tasks || [],
        nextTaskId: item.nextTaskId,
        impact: item.impact,
      };
      
      setCurrentJob(formattedJob);
      setTaskSidebarOpen(true);
    }
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
        setNeedsRefresh(n => !n);
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
        setNeedsRefresh(n => !n);
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
      setNeedsRefresh(n => !n);
    }
    setSidebarOpen(open);
  };

  const handleTaskSidebarChange = (open: boolean) => {
    if (!open && needsRefresh) {
      setNeedsRefresh(n => !n);
    }
    setTaskSidebarOpen(open);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setResults(prevResults => 
      prevResults.map(result => {
        if ((result._id || result.id) === updatedTask.id) {
          return {
            ...result,
            ...updatedTask,
            _id: result._id || updatedTask.id,
          };
        }
        return result;
      })
    );
    
    setNeedsRefresh(n => !n);
  };

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-2xl font-bold text-center">
            {query.trim()
              ? <>
                  <span className="font-medium">searching:</span>{" "}
                  <span className="italic">{query}</span>
                </>
              : "Search"}
          </h1>
        </div>

        {error && <div className="error text-red-500 mb-4">{error}</div>}

        {/* Search Results */}
        <div className="search-results">
          {loading ? (
            <p className="text-center py-8 text-gray-500">Searching...</p>
          ) : results.length > 0 ? (
            <div className="flex justify-center">
              <div className="flex flex-col space-y-4 items-center">
                {results.map((result, index) => (
                  <SearchResultCard
                    key={result.id || result._id || index}
                    result={result}
                    index={index}
                    onOpenTasksSidebar={handleOpenSidebar}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    taskOwnerMap={taskOwnerMap}
                    jobs={jobs}
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

        {/* Task Details Sidebar - For tasks */}
        <TaskDetailsSidebar
          open={sidebarOpen}
          onOpenChange={handleSidebarChange}
          selectedTask={currentItem}
          onTaskUpdated={handleTaskUpdated}
          onDeleteTask={handleDeleteItem}
        />

        {/* Tasks Sidebar - For jobs */}
        <TasksSidebar
          open={taskSidebarOpen}
          onOpenChange={handleTaskSidebarChange}
          selectedJob={currentJob}
          onRefreshJobs={() => setNeedsRefresh(n => !n)}
          onDeleteJob={handleDeleteItem}
        />

        {/* Task Edit Dialog */}
        {editingItem && editingItem.type?.toLowerCase() === 'task' && (
          <TaskDialog
            mode="edit"
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            onSubmit={handleTaskSubmit}
            initialData={editingItem}
            jobs={jobs}
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