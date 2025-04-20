"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell, HelpCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  }
  
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${remainingMinutes} ${remainingMinutes === 1 ? 'min' : 'mins'}`;
};

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [hasNotification, setHasNotification] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [appointmentVisible, setAppointmentVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState<string>("");

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
              notificationData.upcomingEvent.start.dateTime
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
    if (pathname === "/dashboard/jobs") {
      e.preventDefault();

      // Create and dispatch a custom event that the JobsPage can listen for
      const event = new CustomEvent("openJobDialog");
      window.dispatchEvent(event);
    } else {
      // Normal navigation to jobs page with query param
      router.push("/dashboard/jobs?open=true");
    }
  };

  // Handle notification click
  const handleNotificationClick = async () => {
    if (hasNotification && notification) {
      // Mark notification as read by calling the API
      const notificationId = notification._id;
      
      if (notificationId) {
        try {
          await fetch(`/api/notifications/${notificationId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Error marking notification as read:', error);
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
    if (pathname === "/dashboard/jobs") {
      // If on jobs page, apply filter directly
      if (minutesRemaining) {
        window.dispatchEvent(
          new CustomEvent("applyTimeFilter", {
            detail: { minutes: minutesRemaining },
          })
        );
      }
    } else {
      // Store time for filter and navigate to jobs page
      if (minutesRemaining) {
        sessionStorage.setItem("appointmentTime", minutesRemaining.toString());
      }
      router.push("/dashboard/jobs");
    }
  };

  // Handle start tour button click
  const handleStartTourClick = () => {
    if (pathname === "/dashboard/jobs") {
      // If already on jobs page, use a direct event for immediate response
      
      // 1. Add tour parameter to URL for consistency/bookmarking
      const timestamp = Date.now();
      const newUrl = `/dashboard/jobs?tour=true&t=${timestamp}`;
      window.history.pushState({}, "", newUrl);

      // 2. Dispatch a direct custom event for immediate handling
      const directEvent = new CustomEvent(TOUR_START_EVENT);
      window.dispatchEvent(directEvent);
    } else {
      // Navigate to jobs page with tour query param
      router.push("/dashboard/jobs?tour=true");
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

        <Link href="/dashboard/search">
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

        <Link href="/dashboard/jobs?open=true" onClick={handleCreateJobClick}>
          <Button className="mr-4 bg-[#f05523] hover:bg-[#f05523]/90 text-white">
            Create a Job
          </Button>
        </Link>
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
                You have an <span className="font-medium">{eventTitle}</span> in{" "}
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