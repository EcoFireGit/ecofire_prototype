import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell } from "lucide-react";

const Navbar = () => {
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

      <Link href="/dashboard/jobs">
        <Button className="mr-4 bg-[#f05523] hover:bg-[#f05523]/90 text-white">
          Create a Job
        </Button>
      </Link>

      <UserButton />
    </div>
  );
};

export default Navbar;
