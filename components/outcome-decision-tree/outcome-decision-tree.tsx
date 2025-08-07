import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowDownRight } from 'lucide-react';
import { TasksSidebar } from '@/components/tasks/tasks-sidebar';
import { TaskDetailsSidebar } from '@/components/tasks/task-details-sidebar';
import type { Job as TableJob } from '@/components/jobs/table/columns';
import { useRouter } from 'next/navigation';

interface QBO {
  _id: string;
  name: string;
  unit?: string;
  currentValue: number;
  targetValue: number;
  points: number;
  notes?: string;
}

interface PI {
  _id: string;
  name: string;
  unit?: string;
  beginningValue: number;
  targetValue: number;
  notes?: string;
}

interface Job {
  _id: string;
  title: string;
  jobNumber?: number;
  dueDate?: Date;
  notes?: string;
  isDone: boolean;

}

interface Task {
  _id: string;
  title: string;
  owner?: string;
  date?: Date;
  requiredHours?: number;
  focusLevel?: 'High' | 'Medium' | 'Low';
  joyLevel?: 'High' | 'Medium' | 'Low';
  notes?: string;
  tags?: string[];
  jobId: string;
  userId: string;
  completed: boolean;
  isDeleted: boolean;
}

interface BusinessInfo {
  userId: string;
  name: string;
  industry: string;
  missionStatement: string;
  monthsInBusiness: number;
  annualRevenue: number;
  growthStage: string;
}

interface PIQBOMapping {
  _id: string;
  piId: string;
  qboId: string;
}

interface JobPIMapping {
  _id: string;
  jobId: string;
  piId: string;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
}

type ItemType = 'qbo' | 'pi' | 'job';

interface SelectedItem {
  id: string;
  type: ItemType;
}

// Helper to map API Job to Table Job type
function mapJobToSidebarJob(job: any): TableJob {
  return {
    id: job._id,
    jobNumber: job.jobNumber ?? 0,
    title: job.title,
    notes: job.notes,
    businessFunctionId: job.businessFunctionId,
    businessFunctionName: job.businessFunctionName,
    dueDate: job.dueDate ? (typeof job.dueDate === 'string' ? job.dueDate : new Date(job.dueDate).toISOString()) : undefined,
    createdDate: job.createdDate ? (typeof job.createdDate === 'string' ? job.createdDate : new Date(job.createdDate).toISOString()) : new Date().toISOString(),
    isDone: job.isDone,
    nextTaskId: (job as any).nextTaskId ?? undefined,
    tasks: (job as any).tasks ?? undefined,
    impact: (job as any).impact ?? undefined,
  };
}

// Helper to adapt a Task for TaskDetailsSidebar
function toSidebarTask(task: Task): any {
  return {
    ...task,
    id: task._id,
    isNextTask: (task as any).isNextTask ?? false,
  };
}

const OutcomeDecisionTree = () => {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  
  const [qbos, setQbos] = useState<QBO[]>([]);
  const [pis, setPis] = useState<PI[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [piQboMappings, setPiQboMappings] = useState<PIQBOMapping[]>([]);
  const [jobPiMappings, setJobPiMappings] = useState<JobPIMapping[]>([]);
  const [userPreferences, setUserPreferences] = useState({
    enableBackstage: false,
    enableTableView: false,
  });
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [tasksSidebarOpen, setTasksSidebarOpen] = useState(false);
  const [sidebarJob, setSidebarJob] = useState<TableJob | null>(null);
  const [jobsMap, setJobsMap] = useState<Record<string, any>>({});
  const [taskDetailsSidebarOpen, setTaskDetailsSidebarOpen] = useState(false);
  const [sidebarTask, setSidebarTask] = useState<Task | null>(null);
  const router = useRouter();

  // Callback functions for partial updates
  const handleTaskCreated = (newTask: any) => {
    // Update allTasks
    setAllTasks(prev => [...prev, newTask]);

    // Update jobsMap if needed
    if (newTask.jobId && jobsMap[newTask.jobId]) {
      setJobsMap(prev => ({
        ...prev,
        [newTask.jobId]: {
          ...prev[newTask.jobId],
          tasks: [...(prev[newTask.jobId].tasks || []), newTask]
        }
      }));
    }

    // Update jobs state to reflect the new task count
    setJobs(prev => prev.map(job => {
      if (job._id === newTask.jobId) {
        return { ...job };
      }
      return job;
    }));
  };

  const handleTaskUpdated = (updatedTask: any) => {
    // Update allTasks
    setAllTasks(prev => prev.map(task =>
      (task._id === updatedTask._id || task._id === updatedTask.id) ? { ...task, ...updatedTask } : task
    ));

    // Update jobsMap if needed
    if (updatedTask.jobId && jobsMap[updatedTask.jobId]) {
      setJobsMap(prev => ({
        ...prev,
        [updatedTask.jobId]: {
          ...prev[updatedTask.jobId],
          tasks: (prev[updatedTask.jobId].tasks || []).map((task: any) =>
            (task._id === (updatedTask._id || updatedTask.id)) ? updatedTask : task
          )
        }
      }));
    }

    // Update jobs state to reflect the updated task
    setJobs(prev => prev.map(job => {
      if (job._id === updatedTask.jobId) {
        return { ...job };
      }
      return job;
    }));
  };

  const handleTaskDeleted = (deletedTaskId: string, jobId?: string) => {
    // Remove from allTasks
    setAllTasks(prev => prev.filter(task => task._id !== deletedTaskId));

    // Update jobsMap if needed
    if (jobId && jobsMap[jobId]) {
      setJobsMap(prev => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          tasks: (prev[jobId].tasks || []).filter((task: any) => (task._id !== deletedTaskId))
        }
      }));
    }

    // Update jobs state to reflect the deleted task
    setJobs(prev => prev.map(job => {
      if (job._id === jobId) {
        return { ...job };
      }
      return job;
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [qbosRes, pisRes, jobsRes] = await Promise.all([
        fetch('/api/qbos'),
        fetch('/api/pis'),
        fetch('/api/jobs')
      ]);

      if (!qbosRes.ok || !pisRes.ok || !jobsRes.ok) {
        throw new Error('Failed to fetch core data');
      }

      const [qbosData, pisData, jobsData] = await Promise.all([
        qbosRes.json() as Promise<APIResponse<QBO[]>>,
        pisRes.json() as Promise<APIResponse<PI[]>>,
        jobsRes.json() as Promise<APIResponse<Job[]>>
      ]);

      if (!qbosData.success || !pisData.success || !jobsData.success) {
        throw new Error('API returned error response');
      }

      setQbos(qbosData.data);
      setPis(pisData.data);
      setJobs(jobsData.data);

      if (jobsData.data.length > 0) {
        const allTasksArray: Task[] = [];
        
        const taskPromises = jobsData.data.map(async (job) => {
          try {
            const taskRes = await fetch(`/api/tasks?jobId=${job._id}`);
            
            if (taskRes.ok) {
              const taskData = await taskRes.json();
              if (taskData.success && taskData.data) {
                return taskData.data;
              }
            }
          } catch (error) {
            console.error(`Error fetching tasks for job ${job._id}:`, error);
          }
          return [];
        });

        const taskResults = await Promise.allSettled(taskPromises);
        taskResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            allTasksArray.push(...result.value);
          }
        });

        setAllTasks(allTasksArray);
      }

      try {
        const [piQboRes, jobPiRes] = await Promise.all([
          fetch('/api/pi-qbo-mappings'),
          fetch('/api/pi-job-mappings')
        ]);

        if (piQboRes.ok) {
          const piQboData = await piQboRes.json() as APIResponse<PIQBOMapping[]>;
          if (piQboData.success) {
            setPiQboMappings(piQboData.data);
          }
        }

        if (jobPiRes.ok) {
          const jobPiData = await jobPiRes.json() as APIResponse<JobPIMapping[]>;
          if (jobPiData.success) {
            setJobPiMappings(jobPiData.data);
          }
        }
        
      } catch (mappingError) {
        console.error('Error fetching mappings:', mappingError);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const result = await response.json();

      if (result.success) {
        setUserPreferences({
          enableBackstage: result.data.enableBackstage,
          enableTableView: result.data.enableTableView,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user preferences:", error);
    }
  };

  const fetchBusinessInfo = async () => {
    try {
      const response = await fetch("/api/business-info");
      
      if (!response.ok) {
        console.error("Business info API response not ok:", response.status, response.statusText);
        return;
      }
      
      const businessInfo = await response.json();
      console.log("Business info API result:", businessInfo);

      if (businessInfo && businessInfo.name) {
        console.log("Setting business info:", businessInfo);
        setBusinessInfo(businessInfo);
      } else {
        console.error("Business info API returned no data or missing name:", businessInfo);
      }
    } catch (error) {
      console.error("Failed to fetch business info:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUserPreferences();
    fetchBusinessInfo();
  }, []);

  // After jobs are loaded, build jobsMap for sidebar
  useEffect(() => {
    const map: Record<string, any> = {};
    jobs.forEach(job => {
      map[job._id] = {
        _id: job._id,
        title: job.title,
        jobNumber: job.jobNumber,
        businessFunctionId: (job as any).businessFunctionId ?? undefined,
        businessFunctionName: (job as any).businessFunctionName ?? undefined,
        dueDate: job.dueDate,
        isDone: job.isDone,
        nextTaskId: (job as any).nextTaskId ?? undefined,
        tasks: (job as any).tasks ?? undefined,
        impact: (job as any).impact ?? undefined,
        notes: job.notes,
        createdDate: (job as any).createdDate ?? undefined,
      };
    });
    setJobsMap(map);
  }, [jobs]);

  // Listen for job/task update events and trigger partial refresh
  useEffect(() => {
    const handleJobProgressUpdate = (event: CustomEvent) => {
      // Optionally, you could do a more targeted update, but for now, re-fetch all data
      fetchData();
    };
    const handleForceJobsRefresh = (event: CustomEvent) => {
      fetchData();
    };
    window.addEventListener('job-progress-update', handleJobProgressUpdate as EventListener);
    window.addEventListener('force-jobs-refresh', handleForceJobsRefresh as EventListener);
    return () => {
      window.removeEventListener('job-progress-update', handleJobProgressUpdate as EventListener);
      window.removeEventListener('force-jobs-refresh', handleForceJobsRefresh as EventListener);
    };
  }, []);

  const getTasksForSelection = (selectedId: string, selectedType: ItemType): Task[] => {
    if (selectedType === 'job') {
      return allTasks.filter(task => task.jobId === selectedId);
    } else if (selectedType === 'qbo') {
      const connectedPIs = piQboMappings
        .filter(mapping => mapping.qboId === selectedId)
        .map(mapping => mapping.piId);
      
      const connectedJobIds = jobPiMappings
        .filter(mapping => connectedPIs.includes(mapping.piId))
        .map(mapping => mapping.jobId);

      return allTasks.filter(task => connectedJobIds.includes(task.jobId));
    } else if (selectedType === 'pi') {
      const connectedJobIds = jobPiMappings
        .filter(mapping => mapping.piId === selectedId)
        .map(mapping => mapping.jobId);

      return allTasks.filter(task => connectedJobIds.includes(task.jobId));
    }
    return [];
  };

  const handleItemClick = (id: string, type: ItemType) => {
    if (selectedItem?.id === id && selectedItem?.type === type) {
      setSelectedItem(null);
      setSelectedTasks([]);
    } else {
      setSelectedItem({ id, type });
      const tasks = getTasksForSelection(id, type);
      setSelectedTasks(tasks);
    }
  };

  const isHighlighted = (id: string, type: ItemType): boolean => {
    if (!selectedItem) return false;
    
    const { id: selectedId, type: selectedType } = selectedItem;
    
    if (type === selectedType && id === selectedId) {
      return true;
    }
    
    if (selectedType === 'qbo') {
      if (type === 'pi') {
        return piQboMappings.some(mapping => {
          return mapping.qboId === selectedId && mapping.piId === id;
        });
      }
      if (type === 'job') {
        const connectedPIs = piQboMappings
          .filter(mapping => mapping.qboId === selectedId)
          .map(mapping => mapping.piId);
        
        return jobPiMappings.some(mapping => {
          return connectedPIs.includes(mapping.piId) && mapping.jobId === id;
        });
      }
    } else if (selectedType === 'pi') {
      if (type === 'qbo') {
        return piQboMappings.some(mapping => {
          return mapping.piId === selectedId && mapping.qboId === id;
        });
      }
      if (type === 'job') {
        return jobPiMappings.some(mapping => {
          return mapping.piId === selectedId && mapping.jobId === id;
        });
      }
    } else if (selectedType === 'job') {
      if (type === 'pi') {
        return jobPiMappings.some(mapping => {
          return mapping.jobId === selectedId && mapping.piId === id;
        });
      }
      if (type === 'qbo') {
        const connectedPIs = jobPiMappings
          .filter(mapping => mapping.jobId === selectedId)
          .map(mapping => mapping.piId);
        
        return piQboMappings.some(mapping => {
          return connectedPIs.includes(mapping.piId) && mapping.qboId === id;
        });
      }
    }
    
    return false;
  };

  const getJobTaskStatus = (jobId: string): string => {
    const jobTasks = allTasks.filter(task => task.jobId === jobId);
    if (jobTasks.length === 0) return "No tasks";
    
    const completedTasks = jobTasks.filter(task => task.completed).length;
    const totalTasks = jobTasks.length;
    
    return `${completedTasks} of ${totalTasks} tasks done`;
  };

  const isJobCompleted = (jobId: string): boolean => {

    const job = jobs.find(job => job._id === jobId);
    return job ? job.isDone : false;
  };

  const getItemStyle = (id: string, type: ItemType): string => {
    const baseStyle = "p-3 mr-3 mb-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md inline-block";
    const highlighted = isHighlighted(id, type);
    
    if (highlighted) {
      return `${baseStyle} bg-yellow-100 border-yellow-400 shadow-lg font-medium`;
    }
    
    switch (type) {
      case 'qbo':
        return `${baseStyle} bg-blue-50 border-blue-200 hover:bg-blue-100`;
      case 'pi':
        return `${baseStyle} bg-green-50 border-green-200 hover:bg-green-100`;
      case 'job':
        return `${baseStyle} bg-purple-50 border-purple-200 hover:bg-purple-100`;
      default:
        return baseStyle;
    }
  };

  const getTaskStyle = (task: Task): string => {
    const baseStyle = "p-3 mr-3 mb-3 rounded-lg border transition-all duration-200 inline-block";
    
    if (task.completed) {
      return `${baseStyle} bg-gray-100 border-gray-300 opacity-60`;
    }
    
    return `${baseStyle} bg-orange-50 border-orange-200 hover:bg-orange-100`;
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const getMissionImpactPercentage = (qbo: QBO): number => {
    const totalPoints = qbos.reduce((sum, q) => sum + (q.points || 0), 0);
    return totalPoints > 0 ? Math.round((qbo.points / totalPoints) * 100) : 0;
  };

  const getActiveAndCompletedJobs = () => {
    const activeJobs = jobs.filter(job => !isJobCompleted(job._id));
    const completedJobs = jobs.filter(job => isJobCompleted(job._id));
    return { activeJobs, completedJobs };
  };

  const getActiveAndCompletedTasks = () => {
    const activeTasks = selectedTasks.filter(task => !task.completed);
    const completedTasks = selectedTasks.filter(task => task.completed);
    return { activeTasks, completedTasks };
  };

  useEffect(() => {
    if (selectedItem) {
      const tasks = getTasksForSelection(selectedItem.id, selectedItem.type);
      setSelectedTasks(tasks);
    } else {
      setSelectedTasks([]);
    }
  }, [allTasks, selectedItem, jobPiMappings, piQboMappings]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-gray-700 text-sm mb-3">
          For your business <span className="font-semibold">{businessInfo?.name || ''}</span>: Visualize how your business outcomes connect to the specific jobs—and tasks—that drive them. This decision tree helps you trace every result back to the actions that made it happen, so you can double down on what works and eliminate what doesn't.
        </p>
        <p className="text-gray-600 text-sm">
          Click any item to highlight its connections. Click again to deselect.
        </p>
        <div className="mt-2 text-sm text-blue-600">
          {selectedItem 
            ? `Selected: ${selectedItem.type === 'qbo' ? 'OUTCOME' : selectedItem.type === 'pi' ? 'OUTPUT' : selectedItem.type.toUpperCase()} - Showing related items`
            : 'No selections'
          }
        </div>
      </div>

      {/* Connection Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2">Connection Summary</h3>
        <div className={`grid gap-4 text-sm ${userPreferences.enableBackstage ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <span className="font-medium text-blue-600">
              {selectedItem ? qbos.filter(qbo => isHighlighted(qbo._id, 'qbo')).length : '--'}
            </span>
            <span className="text-gray-600"> outcome(s)</span>
          </div>
          {userPreferences.enableBackstage && (
            <div>
              <span className="font-medium text-green-600">
                {selectedItem ? pis.filter(pi => isHighlighted(pi._id, 'pi')).length : '--'}
              </span>
              <span className="text-gray-600"> output(s)</span>
            </div>
          )}
          <div>
            <span className="font-medium text-purple-600">
              {selectedItem ? jobs.filter(job => isHighlighted(job._id, 'job')).length : '--'}
            </span>
            <span className="text-gray-600"> job(s)</span>
          </div>
          <div>
            <span className="font-medium text-orange-600">
              {selectedItem ? selectedTasks.length : '--'}
            </span>
            <span className="text-gray-600"> task(s)</span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Outcomes Row */}
        <div>
          <h2 className="text-lg font-semibold text-blue-800 mb-4 border-b border-blue-200 pb-2">
            Outcomes ({qbos.length})
          </h2>
          <div className="flex flex-wrap">
            {qbos.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No outcomes found</p>
            ) : (
              qbos.map((qbo) => (
                <div
                  key={qbo._id}
                  className={getItemStyle(qbo._id, 'qbo')}
                  onClick={() => handleItemClick(qbo._id, 'qbo')}
                >
                  <div className="font-medium text-sm">{qbo.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Current Value: {qbo.currentValue} • Target Value: {qbo.targetValue} {qbo.unit && `${qbo.unit}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    Mission Impact: {getMissionImpactPercentage(qbo)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outputs Row - Only show if backstage is enabled */}
        {userPreferences.enableBackstage && (
          <div>
            <h2 className="text-lg font-semibold text-green-800 mb-4 border-b border-green-200 pb-2">
              Outputs ({pis.length})
            </h2>
            <div className="flex flex-wrap">
              {pis.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No outputs found</p>
              ) : (
                pis.map((pi) => (
                  <div
                    key={pi._id}
                    className={getItemStyle(pi._id, 'pi')}
                    onClick={() => handleItemClick(pi._id, 'pi')}
                  >
                    <div className="font-medium text-sm">{pi.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Start Value: {pi.beginningValue} • Target Value: {pi.targetValue} {pi.unit && `${pi.unit}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Jobs Row */}
        <div>
          <h2 className="text-lg font-semibold text-purple-800 mb-4 border-b border-purple-200 pb-2">
            Jobs ({jobs.length})
          </h2>
          <div className="flex flex-wrap">
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No jobs found</p>
            ) : (
              <>
                {/* Active Jobs */}
                {getActiveAndCompletedJobs().activeJobs.map((job) => (
                  <div
                    key={job._id}
                    className={getItemStyle(job._id, 'job')}
                    onClick={() => handleItemClick(job._id, 'job')}
                    style={{ position: 'relative' }}
                  >
                    <div className="font-medium text-sm">{job.title}</div>
                    {job.dueDate && (
                      <div className="text-xs text-gray-600 mt-1">
                        Due Date: {formatDate(job.dueDate)}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {getJobTaskStatus(job._id)}
                    </div>
                    {/* Arrow at bottom right */}
                    <button
                      type="button"
                      aria-label="Show job tasks"
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        background: 'white',
                        borderRadius: '50%',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        padding: 2,
                        zIndex: 2,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        setSidebarJob(mapJobToSidebarJob(job));
                        setTasksSidebarOpen(true);
                      }}
                    >
                      <ArrowDownRight className="h-4 w-4 text-purple-700" />
                    </button>
                  </div>
                ))}

                {/* Completed Jobs Collapsible Section */}
                {getActiveAndCompletedJobs().completedJobs.length > 0 && (
                  <div className="w-full">
                    <button
                      onClick={() => setShowCompletedJobs(!showCompletedJobs)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors mt-2 mb-3"
                    >
                      {showCompletedJobs ? (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-1" />
                      )}
                      Completed Jobs ({getActiveAndCompletedJobs().completedJobs.length})
                    </button>
                    {showCompletedJobs && (
                      <div className="flex flex-wrap">
                        {getActiveAndCompletedJobs().completedJobs.map((job) => (
                          <div
                            key={job._id}
                            className={getItemStyle(job._id, 'job')}
                            onClick={() => handleItemClick(job._id, 'job')}
                          >
                            <div className="font-medium text-sm">{job.title}</div>
                            {job.dueDate && (
                              <div className="text-xs text-gray-600 mt-1">
                                Due Date: {formatDate(job.dueDate)}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {getJobTaskStatus(job._id)}
                            </div>
                            <div className="text-xs text-green-600 mt-1 font-medium">
                              ✓ Completed
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Related Tasks Row */}
        {selectedItem && selectedTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-orange-800 mb-4 border-b border-orange-200 pb-2">
              Related Tasks ({selectedTasks.length})
            </h2>
            <div className="flex flex-wrap">
              {/* Active Tasks */}
              {getActiveAndCompletedTasks().activeTasks.map((task) => (
                <div
                  key={task._id}
                  className={getTaskStyle(task)}
                  style={{ position: 'relative' }}
                >
                  <div className="font-medium text-sm">{task.title}</div>
                  {task.date && (
                    <div className="text-xs text-gray-600 mt-1">
                      Do Date: {formatDate(task.date)}
                    </div>
                  )}
                  {/* Arrow icon to open task details sidebar */}
                  <button
                    type="button"
                    aria-label="Show task details"
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      background: 'white',
                      borderRadius: '50%',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      padding: 2,
                      zIndex: 2,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      setSidebarTask(toSidebarTask(task));
                      setTaskDetailsSidebarOpen(true);
                    }}
                  >
                    <ArrowDownRight className="h-4 w-4 text-orange-700" />
                  </button>
                </div>
              ))}

              {/* Completed Tasks Collapsible Section */}
              {getActiveAndCompletedTasks().completedTasks.length > 0 && (
                <div className="w-full">
                  <button
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors mt-2 mb-3"
                  >
                    {showCompletedTasks ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    Completed Tasks ({getActiveAndCompletedTasks().completedTasks.length})
                  </button>
                  {showCompletedTasks && (
                    <div className="flex flex-wrap">
                      {getActiveAndCompletedTasks().completedTasks.map((task) => (
                        <div
                          key={task._id}
                          className={getTaskStyle(task)}
                          style={{ position: 'relative' }}
                        >
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.date && (
                            <div className="text-xs text-gray-600 mt-1">
                              Do Date: {formatDate(task.date)}
                            </div>
                          )}
                          <div className="text-xs text-green-600 mt-1 font-medium">
                            ✓ Completed
                          </div>
                          {/* Arrow icon to open task details sidebar */}
                          <button
                            type="button"
                            aria-label="Show task details"
                            style={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              background: 'white',
                              borderRadius: '50%',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              padding: 2,
                              zIndex: 2,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              setSidebarTask(toSidebarTask(task));
                              setTaskDetailsSidebarOpen(true);
                            }}
                          >
                            <ArrowDownRight className="h-4 w-4 text-orange-700" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Render the TasksSidebar */}
      {tasksSidebarOpen && sidebarJob && (
        <TasksSidebar
          open={tasksSidebarOpen}
          onOpenChange={setTasksSidebarOpen}
          selectedJob={sidebarJob}
          jobs={jobsMap}
          onTaskCreated={handleTaskCreated}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}
      {/* Render the TaskDetailsSidebar */}
      {taskDetailsSidebarOpen && sidebarTask && (
        <TaskDetailsSidebar
          open={taskDetailsSidebarOpen}
          onOpenChange={setTaskDetailsSidebarOpen}
          selectedTask={toSidebarTask(sidebarTask)}
          onNavigateToJob={jobId => {
            setTaskDetailsSidebarOpen(false);
            // Find the job in jobs or jobsMap and always use mapJobToSidebarJob
            const jobRaw = jobs.find(j => j._id === jobId) || jobsMap[jobId];
            if (jobRaw) {
              const job = mapJobToSidebarJob(jobRaw);
              setSidebarJob(job);
              setTasksSidebarOpen(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default OutcomeDecisionTree;