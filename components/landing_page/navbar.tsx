"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell, HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Create a direct custom event to handle same-page tour starts
const TOUR_START_EVENT = "directTourStart";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  
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
      <Button variant="ghost" size="icon" className="mr-4">
        <Bell className="h-6 w-6" />
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