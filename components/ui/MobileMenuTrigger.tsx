import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileMenuTrigger() {
  const { isMobile, setOpenMobile } = useSidebar();

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden" // Hide on desktop since desktop has the sidebar visible
      onClick={() => setOpenMobile(true)}
    >
      <Menu className="h-6 w-6" />
      <span className="sr-only">Open sidebar</span>
    </Button>
  );
}