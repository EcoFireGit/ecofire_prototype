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
    
    // Reset all tour flags to ensure we start fresh
    localStorage.removeItem('hasSeenWelcome');
    localStorage.removeItem('hasCompletedTour');
    
    if (pathname === "/dashboard/jobs") {
      // If already on jobs page, use URL approach with a unique timestamp
      const timestamp = Date.now();
      const newUrl = `/dashboard/jobs?tour=true&t=${timestamp}`;
      
      console.log(`Navigating to ${newUrl} (soft navigation)`);
      router.push(newUrl);
    } else {
      // Navigate to jobs page with tour query param
      console.log("Navigating to jobs page with tour param");
      router.push("/dashboard/jobs?tour=true");
    }
  };
  
  return (
    <div className="w-full px-4 py-3 flex justify-end items-center mt-5">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2">
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
            <div className="pt-2 border-t border-gray-100">
              <Link href="/help" className="text-xs text-blue-600 hover:underline">
                View help documentation
              </Link>
            </div>
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

export default Navbar;