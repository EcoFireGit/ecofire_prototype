"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell, HelpCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { JobDialog } from "@/components/jobs/job-dialog";
import { useToast } from "@/hooks/use-toast";
import { Jobs } from "@/lib/models/job.model";
import { Job, columns } from "@/components/jobs/table/columns";
import { BusinessFunctionForDropdown } from "@/lib/models/business-function.model";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function convertJobsToTableData(
  jobs: Jobs[],
  businessFunctions: BusinessFunctionForDropdown[],
): Job[] {
  return jobs.map((job) => {
    // Find the business function name if it exists
    const businessFunction = job.businessFunctionId
      ? businessFunctions.find((bf) => bf.id === job.businessFunctionId)
      : undefined;

    return {
      id: job._id,
      title: job.title,
      notes: job.notes || undefined,
      businessFunctionId: job.businessFunctionId || undefined,
      businessFunctionName: businessFunction?.name || undefined,
      dueDate: job.dueDate ? new Date(job.dueDate).toISOString() : undefined,
      isDone: job.isDone || false,
      nextTaskId: job.nextTaskId || undefined,
      tasks: job.tasks || [],
      impact: job.impact || 0,
      // Owner removed as it's now derived from the next task
    };
  });
}


// Create a direct custom event to handle same-page tour starts
const TOUR_START_EVENT = "directTourStart";

// Interface for notification data
interface NotificationData {
  _id: {
    $oid: string;
  };
  userId: string;
  type: string;
  message: string;
  upcomingEvent: {
    summary: string;
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
  };
  seen: boolean;
  createdAt: {
    $date: string;
  };
}

 
// Function to format minutes into hours and minutes
const formatTimeRemaining = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "min" : "mins"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
  }

  return `${hours} ${hours === 1 ? "hr" : "hrs"} ${remainingMinutes} ${remainingMinutes === 1 ? "min" : "mins"}`;
};

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [hasNotification, setHasNotification] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [appointmentVisible, setAppointmentVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState<string>("");
  
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false); //State to track job creation
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
 const [businessFunctions, setBusinessFunctions] = useState<
    BusinessFunctionForDropdown[]
  >([]);
const [loading, setLoading] = useState(true);
const [owners, setOwners] = useState<{ _id: string; name: string }[]>([]);
const [tags, setTags] = useState<{ _id: string; name: string }[]>([]);
const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});
const [taskDetails, setTaskDetails] = useState<Record<string, any>>({});
const [error, setError] = useState<string | null>(null);
const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [filteredActiveJobs, setFilteredActiveJobs] = useState<Job[]>([]);
  const [sortedActiveJobs, setSortedActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [filteredCompletedJobs, setFilteredCompletedJobs] = useState<Job[]>([]);
  const [sortedCompletedJobs, setSortedCompletedJobs] = useState<Job[]>([]);


  const handleCreate = async (jobData: Partial<Job>) => {
    setCreatingJob(true); // Set creating job state to true
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...jobData,
          // Ensure we're sending businessFunctionId, not businessFunctionName
          businessFunctionId: jobData.businessFunctionId,
          // No need to send owner as it's derived from the next task
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job successfully created",
        });
        await fetchJobs(); // Refresh jobs and wait for it to complete

        // Now we can close the dialog after jobs have been refreshed
        setDialogOpen(false);
        router.push('/jobs');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setCreatingJob(false); // Reset creating job state
    }
  };


  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // If dialog is closing, reset editing job
      setEditingJob(undefined);
    }
  };


  // Function to first fetch api/gcal to create notifications in the backend and then fetch notifications
  const fetchNotifications = async () => {
    try {
      const gcalResponse = await fetch("/api/gcal");
      if (!gcalResponse.ok) {
        throw new Error("Failed to fetch Google Calendar data");
      } else {
        const response = await fetch("/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }

        const data = await response.json();

        if (data.success && data.data) {
          const notificationData = data.data as NotificationData;

          // Check if there's a notification
          if (notificationData && notificationData.upcomingEvent) {
            // Calculate time remaining
            const eventTime = new Date(
              notificationData.upcomingEvent.start.dateTime,
            );
            const currentTime = new Date();
            const diffMs = eventTime.getTime() - currentTime.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);

            // Only set notification if event hasn't passed
            if (diffMinutes > 0) {
              setNotification(notificationData);
              setHasNotification(true);
              setMinutesRemaining(diffMinutes);
              // Store the event title
              setEventTitle(notificationData.upcomingEvent.summary);
            } else {
              // Event has passed, clear notification
              setNotification(null);
              setHasNotification(false);
              setMinutesRemaining(null);
              setEventTitle("");
            }
          } else {
            // No notification data
            setNotification(null);
            setHasNotification(false);
            setMinutesRemaining(null);
            setEventTitle("");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await fetch("/api/owners");
      const result = await response.json();

      let ownersData: { _id: string; name: string }[] = [];

      if (Array.isArray(result)) {
        ownersData = result.map((owner) => ({
          _id: owner._id,
          name: owner.name,
        }));
      } else if (result.data && Array.isArray(result.data)) {
        ownersData = result.data.map((owner: any) => ({
          _id: owner._id,
          name: owner.name,
        }));
      }

      setOwners(ownersData);
      return ownersData;
    } catch (error) {
      console.error("Error fetching owners:", error);
      return [];
    }
  };

  const fetchTaskOwners = async (taskIds: string[]) => {
    if (!taskIds.length) return;

    try {
      // First, fetch all owners for this user
      const ownersResponse = await fetch("/api/owners");
      const ownersResult = await ownersResponse.json();

      let ownerMap: Record<string, string> = {};

      // Check the structure of the owners response
      if (Array.isArray(ownersResult)) {
        // Case 1: API returns direct array of owners
        ownersResult.forEach((owner) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      } else if (ownersResult.data && Array.isArray(ownersResult.data)) {
        // Case 2: API returns { data: [...owners] }
        ownersResult.data.forEach((owner: any) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      }

      // Now fetch the tasks with the owner IDs we want to map
      const queryParams = new URLSearchParams();
      taskIds.forEach((id) => queryParams.append("ids", id));

      const tasksResponse = await fetch(
        `/api/tasks/batch?${queryParams.toString()}`,
      );
      const tasksResult = await tasksResponse.json();

      if (!tasksResult.success && !tasksResult.data) {
        console.error("Tasks API did not return success or data");
        return;
      }

      const tasks = tasksResult.data || tasksResult;

      // Map task IDs to owner names
      const taskOwnerMapping: Record<string, string> = {};

      // Also store the detailed task information for filtering
      const taskDetailsMap: Record<string, any> = {};

      tasks.forEach((task: any) => {
        // Store task details for filtering
        taskDetailsMap[task.id || task._id] = task;

        // In your system, task.owner should be the owner ID
        if (task.owner && typeof task.owner === "string") {
          // Look up the owner name from our previously built map
          taskOwnerMapping[task.id || task._id] =
            ownerMap[task.owner] || "Not assigned";
        } else {
          taskOwnerMapping[task.id || task._id] = "Not assigned";
        }
      });

      // Update the state with our new mapping
      setTaskOwnerMap(taskOwnerMapping);
      setTaskDetails(taskDetailsMap);
    } catch (error) {
      console.error("Error creating task owner mapping:", error);
    }
  };

  const sortByRecommended = (jobs: Job[]): Job[] => {
    return [...jobs].sort((a, b) => {
      // First compare due dates (null dates go to the end)
      const dateA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dateB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (dateA !== dateB) {
        return dateA - dateB; // Ascending by date
      }

      // If dates are the same (or both null), sort by impact descending
      const impactA = a.impact || 0;
      const impactB = b.impact || 0;
      return impactB - impactA; // Descending by impact
    });
  };

  // Add a fetchTags function
  const fetchTags = async () => {
    try {
      const response = await fetch("/api/task-tags");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setTags(result.data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleEdit = async (jobData: Partial<Job>) => {
    if (!editingJob) return;

    try {
      const response = await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...jobData,
          // Ensure we're sending businessFunctionId, not businessFunctionName
          businessFunctionId: jobData.businessFunctionId,
          // No need to send owner as it's derived from the next task
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
        // First close the dialog
        setDialogOpen(false);
        // Then clear the editing job state
        setEditingJob(undefined);
        // Finally fetch updated jobs
        fetchJobs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);

      // First fetch business functions
      const bfResponse = await fetch("/api/business-functions");
      const bfResult = await bfResponse.json();

      let currentBusinessFunctions = [];
      if (bfResult.success) {
        currentBusinessFunctions = bfResult.data.map((bf: any) => ({
          id: bf._id,
          name: bf.name,
        }));
        // Update state for later use
        setBusinessFunctions(currentBusinessFunctions);
      }

      // Also fetch owners for filters
      await fetchOwners();
      // Fetch tags for filters
      await fetchTags();

      // Then fetch jobs
      const jobsResponse = await fetch("/api/jobs");
      const jobsResult = await jobsResponse.json();

      if (jobsResult.success) {
        // Collect all next task IDs to fetch their owners
        const taskIds = jobsResult.data
          .filter((job: any) => job.nextTaskId)
          .map((job: any) => job.nextTaskId);

        // Fetch task owners if any tasks exist
        if (taskIds.length > 0) {
          await fetchTaskOwners(taskIds);
        }

        // Use the business functions we just fetched
        const allJobs = convertJobsToTableData(
          jobsResult.data,
          currentBusinessFunctions,
        );

        // Separate active and completed jobs
        const activeJobs = allJobs.filter((job) => !job.isDone);
        const completedJobs = allJobs.filter((job) => job.isDone);

        // Apply sorting to the initial jobs
        const sortedActiveJobs = sortByRecommended(activeJobs);
        const sortedCompletedJobs = sortByRecommended(completedJobs);

        setActiveJobs(activeJobs);
        setFilteredActiveJobs(activeJobs);
        setSortedActiveJobs(sortedActiveJobs);
        setCompletedJobs(completedJobs);
        setFilteredCompletedJobs(completedJobs);
        setSortedCompletedJobs(sortedCompletedJobs);
      } else {
        setError(jobsResult.error);
      }
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Set up polling for notifications every 60 seconds
  useEffect(() => {
    // Fetch on initial load
    fetchNotifications();

    // Set up interval
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 60*60*1000); // fetch notification every 1 hour 

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle create job button click
  const handleCreateJobClick = (e: { preventDefault: () => void }) => {
    // If already on jobs page, prevent default navigation and use custom event

      setDialogOpen(true);
      // Create and dispatch a custom event that the JobsPage can listen for
      // const event = new CustomEvent("openJobDialog");
      // window.dispatchEvent(event);
   
  };

  // Handle notification click
  const handleNotificationClick = async () => {
    if (hasNotification && notification) {
      // Mark notification as read by calling the API
      const notificationId = notification._id;

      if (notificationId) {
        try {
          await fetch(`/api/notifications/${notificationId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }

      setHasNotification(false);

      // Show the appointment notification directly
      if (minutesRemaining) {
        setAppointmentVisible(true);
      }
    }
  };

  // Handle reprioritize button click
  const handleReprioritize = () => {
    setAppointmentVisible(false);

    // Navigate to jobs page with filters if not already there
    if (pathname === "/jobs") {
      // If on jobs page, apply filter directly
      if (minutesRemaining) {
        window.dispatchEvent(
          new CustomEvent("applyTimeFilter", {
            detail: { minutes: minutesRemaining },
          }),
        );
      }
    } else {
      // Store time for filter and navigate to jobs page
      if (minutesRemaining) {
        sessionStorage.setItem("appointmentTime", minutesRemaining.toString());
      }
      router.push("/jobs");
    }
  };

  // Handle start tour button click
  const handleStartTourClick = () => {
    if (pathname === "/jobs") {
      // If already on jobs page, use a direct event for immediate response

      // 1. Add tour parameter to URL for consistency/bookmarking
      const timestamp = Date.now();
      const newUrl = `/jobs?tour=true&t=${timestamp}`;
      window.history.pushState({}, "", newUrl);

      // 2. Dispatch a direct custom event for immediate handling
      const directEvent = new CustomEvent(TOUR_START_EVENT);
      window.dispatchEvent(directEvent);
    } else {
      // Navigate to jobs page with tour query param
      router.push("/jobs?tour=true");
    }
  };


  return (
    <>
      <div className="w-full px-4 py-3 flex justify-end items-center mt-5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              id="help-button"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-4"
            side="bottom"
            align="end"
            sideOffset={10}
          >
            <div className="space-y-3">
              <h4 className="font-medium text-base">Need help?</h4>
              <p className="text-sm text-gray-500">
                Get familiar with our interface by taking a guided tour of the
                main features.
              </p>
              <Button
                className="w-full bg-[#f05523] hover:bg-[#f05523]/90 text-white"
                onClick={handleStartTourClick}
              >
                Start Guided Tour
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Link href="/search">
          <Button variant="ghost" size="icon" className="mr-2">
            <Search className="h-6 w-6" />
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="mr-4 relative"
          onClick={handleNotificationClick}
        >
          <Bell className="h-6 w-6" />
          {hasNotification && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[#f05523]" />
          )}
        </Button>

    <JobDialog
          mode={editingJob ? "edit" : "create"}
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          onSubmit={editingJob ? handleEdit : handleCreate}
          initialData={editingJob}
        />

          <Button type ="submit" onClick ={handleCreateJobClick} className="mr-4 bg-[#f05523] hover:bg-[#f05523]/90 text-white">
            Create a Job
          </Button>
        <UserButton />
      </div>

      {/* Appointment Notification Dialog */}
      {appointmentVisible && minutesRemaining && (
        <div className="fixed bottom-6 left-[17rem] z-50 bg-white rounded-lg shadow-lg p-4 max-w-md border border-blue-300 animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Hey! 👋</p>
              <h4 className="font-medium text-base mb-1">
                Google calendar sync
              </h4>
              <p className="text-sm mb-1">
                You have a "<span className="font-medium">{eventTitle}</span>" event in{" "}
                <span className="text-green-600 font-medium">
                  {formatTimeRemaining(minutesRemaining)}
                </span>
                .
              </p>
              <p className="text-sm text-gray-600 mb-3">
                Do you want to reprioritize your tasks?
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#f05523] text-[#f05523] hover:bg-[#f05523]/10"
                  onClick={handleReprioritize}
                >
                  Reprioritize
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAppointmentVisible(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export both the component and the event name
export default Navbar;
export { TOUR_START_EVENT };

