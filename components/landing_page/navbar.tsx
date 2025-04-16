"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell, HelpCircle } from "lucide-react";
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

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [hasNotification, setHasNotification] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  
  // Function to fetch notifications
  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications...');
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      console.log('Notification data received:', data);
      
      if (data.success && data.data) {
        const notificationData = data.data as NotificationData;
        console.log('Parsed notification data:', notificationData);
        
        // Check if there's a notification
        if (notificationData && notificationData.upcomingEvent) {
          // Calculate time remaining
          const eventTime = new Date(notificationData.upcomingEvent.start.dateTime);
          const currentTime = new Date();
          const diffMs = eventTime.getTime() - currentTime.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);
          
          console.log('Event time:', eventTime);
          console.log('Current time:', currentTime);
          console.log('Minutes remaining until event:', diffMinutes);
          
          // Only set notification if event hasn't passed
          if (diffMinutes > 0) {
            setNotification(notificationData);
            setHasNotification(true);
            setMinutesRemaining(diffMinutes);
            console.log('Notification active - event is in the future');
          } else {
            // Event has passed, clear notification
            setNotification(null);
            setHasNotification(false);
            setMinutesRemaining(null);
            console.log('Notification cleared - event has passed');
          }
        } else {
          // No notification data
          setNotification(null);
          setHasNotification(false);
          setMinutesRemaining(null);
          console.log('No valid notification data found');
        }
      } else {
        console.log('No notification data in response or request failed');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };
  
  // Set up polling for notifications every 60 seconds
  useEffect(() => {
    // Fetch on initial load
    fetchNotifications();
    
    // Set up interval
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 100000); // 100 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle create job button click
  const handleCreateJobClick = (e: { preventDefault: () => void; }) => {
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
  const handleNotificationClick = () => {
    if (hasNotification) {
      setHasNotification(false);
      
      // Pass the event details to the appointment notification
      if (notification && minutesRemaining) {
        const eventDetails = {
          title: notification.upcomingEvent.summary,
          minutes: minutesRemaining
        };
        
        console.log('Opening notification with event details:', eventDetails);
        
        // Trigger the appointment notification to show with event details
        window.dispatchEvent(new CustomEvent("showAppointmentNotification", {
          detail: eventDetails
        }));
      } else {
        console.log('No notification data available for display');
      }
    }
  };

  // Handle start tour button click
  const handleStartTourClick = () => {
    console.log("Start Tour button clicked", { currentPath: pathname });
    
    if (pathname === "/dashboard/jobs") {
      // If already on jobs page, use a direct event for immediate response
      console.log("Already on jobs page, using direct event");
      
      // 1. Add tour parameter to URL for consistency/bookmarking
      const timestamp = Date.now();
      const newUrl = `/dashboard/jobs?tour=true&t=${timestamp}`;
      window.history.pushState({}, "", newUrl);
      
      // 2. Dispatch a direct custom event for immediate handling
      const directEvent = new CustomEvent(TOUR_START_EVENT);
      console.log("Dispatching direct tour start event");
      window.dispatchEvent(directEvent);
    } else {
      // Navigate to jobs page with tour query param
      console.log("Navigating to jobs page with tour parameter");
      router.push("/dashboard/jobs?tour=true");
    }
  };
  
  return (
    <div className="w-full px-4 py-3 flex justify-end items-center mt-5">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2" id="help-button">
            <HelpCircle className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" side="bottom" align="end" sideOffset={10}>
          <div className="space-y-3">
            <h4 className="font-medium text-base">Need help?</h4>
            <p className="text-sm text-gray-500">
              Get familiar with our interface by taking a guided tour of the main features.
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
  );
};

// Export both the component and the event name
export default Navbar;
export { TOUR_START_EVENT };