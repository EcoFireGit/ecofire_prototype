"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell, HelpCircle, Clock, Menu } from "lucide-react";
import { useState, useEffect, SetStateAction, useRef } from "react";
import { JobDialog } from "@/components/jobs/job-dialog";
import { useToast } from "@/hooks/use-toast";
import { Jobs } from "@/lib/models/job.model";
import { Job, columns } from "@/components/jobs/table/columns";
import { BusinessFunctionForDropdown } from "@/lib/models/business-function.model";
import { MobileMenuTrigger } from "../ui/MobileMenuTrigger";
import { useSidebar } from "../ui/sidebar";

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
      createdDate: new Date(job.createdDate!).toISOString(),
      isDone: job.isDone || false,
      nextTaskId: job.nextTaskId || undefined,
      tasks: job.tasks || [],
      impact: job.impact || 0,
    };
  });
}

const TOUR_START_EVENT = "directTourStart";

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

const MobileMenuButton = () => {
  const { isMobile, setOpenMobile } = useSidebar();
  if (!isMobile) {
    return null;
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden mr-2"
      onClick={() => setOpenMobile(true)}
    >
      <Menu className="h-6 w-6" />
      <span className="sr-only">Open menu</span>
    </Button>
  );
};

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showSearch, setShowSearch] = useState(false);

  // Only show last searched item if currently on the /search page
  const initialSearchValue =
    typeof window !== "undefined" && pathname?.startsWith("/search")
      ? (() => {
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            return params.get("q") || "";
          }
          return "";
        })()
      : "";

  const [searchQuery, setSearchQuery] = useState(initialSearchValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pathname?.startsWith("/search")) {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("q") || "");
    } else {
      setSearchQuery("");
    }
  }, [pathname]);

  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  const [hasNotification, setHasNotification] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [appointmentVisible, setAppointmentVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState<string>("");

  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
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
    setCreatingJob(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...jobData,
          businessFunctionId: jobData.businessFunctionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job successfully created",
        });
        await fetchJobs(); // Refresh jobs and wait for it to complete
        window.dispatchEvent(new Event("refreshJobsList"));
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
      setCreatingJob(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingJob(undefined);
    }
  };

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

          if (notificationData && notificationData.upcomingEvent) {
            const eventTime = new Date(
              notificationData.upcomingEvent.start.dateTime,
            );
            const currentTime = new Date();
            const diffMs = eventTime.getTime() - currentTime.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);

            if (diffMinutes > 0) {
              setNotification(notificationData);
              setHasNotification(true);
              setMinutesRemaining(diffMinutes);
              setEventTitle(notificationData.upcomingEvent.summary);
            } else {
              setNotification(null);
              setHasNotification(false);
              setMinutesRemaining(null);
              setEventTitle("");
            }
          } else {
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
      const ownersResponse = await fetch("/api/owners");
      const ownersResult = await ownersResponse.json();

      let ownerMap: Record<string, string> = {};

      if (Array.isArray(ownersResult)) {
        ownersResult.forEach((owner) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      } else if (ownersResult.data && Array.isArray(ownersResult.data)) {
        ownersResult.data.forEach((owner: any) => {
          if (owner._id && owner.name) {
            ownerMap[owner._id] = owner.name;
          }
        });
      }

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

      const taskOwnerMapping: Record<string, string> = {};
      const taskDetailsMap: Record<string, any> = {};

      tasks.forEach((task: any) => {
        taskDetailsMap[task.id || task._id] = task;
        if (task.owner && typeof task.owner === "string") {
          taskOwnerMapping[task.id || task._id] =
            ownerMap[task.owner] || "Not assigned";
        } else {
          taskOwnerMapping[task.id || task._id] = "Not assigned";
        }
      });

      setTaskOwnerMap(taskOwnerMapping);
      setTaskDetails(taskDetailsMap);
    } catch (error) {
      console.error("Error creating task owner mapping:", error);
    }
  };

  const sortByRecommended = (jobs: Job[]): Job[] => {
    return [...jobs].sort((a, b) => {
      const dateA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dateB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      const impactA = a.impact || 0;
      const impactB = b.impact || 0;
      return impactB - impactA;
    });
  };

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
          businessFunctionId: jobData.businessFunctionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
        setDialogOpen(false);
        setEditingJob(undefined);
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
      const bfResponse = await fetch("/api/business-functions");
      const bfResult = await bfResponse.json();

      let currentBusinessFunctions = [];
      if (bfResult.success) {
        currentBusinessFunctions = bfResult.data.map((bf: any) => ({
          id: bf._id,
          name: bf.name,
        }));
        setBusinessFunctions(currentBusinessFunctions);
      }
      await fetchOwners();
      await fetchTags();

      const jobsResponse = await fetch("/api/jobs");
      const jobsResult = await jobsResponse.json();

      if (jobsResult.success) {
        const taskIds = jobsResult.data
          .filter((job: any) => job.nextTaskId)
          .map((job: any) => job.nextTaskId);

        if (taskIds.length > 0) {
          await fetchTaskOwners(taskIds);
        }

        const allJobs = convertJobsToTableData(
          jobsResult.data,
          currentBusinessFunctions,
        );
        const activeJobs = allJobs.filter((job) => !job.isDone);
        const completedJobs = allJobs.filter((job) => job.isDone);

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

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleCreateJobClick = () => {
    setDialogOpen(true);
  };

  const handleNotificationClick = async () => {
    if (hasNotification && notification) {
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

      if (minutesRemaining) {
        setAppointmentVisible(true);
      }
    }
  };

  const handleReprioritize = () => {
    setAppointmentVisible(false);
    if (pathname === "/jobs") {
      if (minutesRemaining) {
        window.dispatchEvent(
          new CustomEvent("applyTimeFilter", {
            detail: { minutes: minutesRemaining },
          }),
        );
      }
    } else {
      if (minutesRemaining) {
        sessionStorage.setItem("appointmentTime", minutesRemaining.toString());
      }
      router.push("/jobs");
    }
  };

  const handleStartTourClick = () => {
    if (pathname === "/jobs") {
      const timestamp = Date.now();
      const newUrl = `/jobs?tour=true&t=${timestamp}`;
      window.history.pushState({}, "", newUrl);
      const directEvent = new CustomEvent(TOUR_START_EVENT);
      window.dispatchEvent(directEvent);
    } else {
      router.push("/jobs?tour=true");
    }
  };

  const handleInputChange = (e: { target: { value: SetStateAction<string>; }; }) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchButtonClick = () => {
    setShowSearch(true);
    if (pathname?.startsWith("/search")) {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("q") || "");
    } else {
      setSearchQuery("");
    }
  };

  const executeSearch = () => {
    if (searchQuery.trim() !== "") {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
    }
  };

  const handleInputKeyDown = (e: { key: string }) => {
    if (e.key === "Enter") {
      executeSearch();
    }
    if (e.key === "Escape") {
      setShowSearch(false);
    }
  };

  return (
    <>
      <div className="w-full px-4 py-3 flex justify-between items-center mt-5">
        <div className="flex items-center">
          <MobileMenuButton />
        </div>
        <div className="flex items-center">
          {!showSearch ? (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={handleSearchButtonClick}
              aria-label="Open search"
            >
              <Search className="h-6 w-6" />
            </Button>
          ) : (
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder="Search..."
                className="
                  h-10 w-56 md:w-72 rounded-md border border-gray-300 pl-4 pr-10
                  focus:border-[#f05523] focus:ring-2 focus:ring-[#f05523]/30
                  transition-colors duration-200 text-sm shadow-sm
                  placeholder-gray-400
                  bg-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-500
                "
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2"
                onClick={executeSearch}
                aria-label="Search"
                tabIndex={-1}
              >
                <Search className="h-5 w-5 text-gray-400" />
                <span className="sr-only">Submit search</span>
              </Button>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-10"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  tabIndex={-1}
                >
                  <span className="sr-only">Clear search</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          )}

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

          <Button type="submit" onClick={handleCreateJobClick} className="mr-4 bg-[#f05523] hover:bg-[#f05523]/90 text-white">
            Create a Job
          </Button>
          <UserButton />
        </div>

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
      </div>
    </>
  );
};

export default Navbar;
export { TOUR_START_EVENT };