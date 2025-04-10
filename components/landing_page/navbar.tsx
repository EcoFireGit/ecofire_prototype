"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell } from "lucide-react";

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

  return (
    <div className="w-full px-4 py-3 flex justify-end items-center mt-5">
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