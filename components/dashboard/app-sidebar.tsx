"use client";

import { useEffect, useCallback, useState } from "react";
import {
  Calendar,
  Home,
  Inbox,
  Settings,
  Download,
  PawPrint,
  Target,
  Clipboard,
  BarChart2,
  ChevronDown,
  Users,
  ClipboardCheck,
  ChartNoAxesCombinedIcon,
  BriefcaseBusinessIcon,
  Heart,
  GitBranch,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { OrganizationSwitcher } from "./organization-switcher";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePathname } from "next/navigation";

// Menu items.
const items = [
  {
    title: "Jija",
    url: "/jija?source=sidepanel",
    icon: PawPrint,
    id: "jija",
  },
  {
    title: "My Notebook",
    url: "/notebook",
    icon: Clipboard,
    id: "notebook",
  },
];
const dashboardItems = [
  {
    title: "Outcome Decision Tree",
    url: "/outcome-decision-tree",
    icon: GitBranch,
  },
];

// Backstage sub-items
const backstageItems = [
  {
    title: "Outcomes",
    url: "/backstage/qos",
    icon: Clipboard,
  },
  {
    title: "Outputs",
    url: "/backstage/pis",
    icon: BarChart2,
  },
  {
    title: "Mappings",
    url: "/backstage/mappings",
    icon: Target,
  },
  {
    title: "Onboarding",
    url: "/backstage/onboarding",
    icon: ClipboardCheck,
  },
];

export function AppSidebar() {
  // Get current pathname for highlighting the active item
  const pathname = usePathname();
  // Access sidebar context to determine if we're in collapsed state
  const { state, isMobile } = useSidebar();

  const effectiveState = isMobile ? "expanded" : state;

  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false);

  // Function to check if a menu item is active
  const isActive = (url: string) => {
    // Handle exact match for dashboard or startsWith for other routes
    if (url === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(url);
  };

  const isDashboardSectionActive = () => {
    return pathname.startsWith("/dashboard") || pathname.startsWith("/outcome-decision-tree");
  };

  const isJobsSectionActive = () => {
    return pathname.startsWith("/jobs");
  };

  const [userPreferences, setUserPreferences] = useState({
    enableBackstage: false,
    enableTableView: false,
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Fetch user preferences on component mount
  useEffect(() => {
    const fetchPreferences = async () => {
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
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    fetchPreferences();
  }, []);

  // Function to handle emoji selection and apply filters
  const handleWellnessSelection = useCallback((mood: string) => {
    // Construct the filters object based on the mood
    let filters = {};

    switch (mood) {
      case "sad":
        // Sad - Show tasks with high joy level (to cheer up)
        filters = { joyLevel: "High" };
        break;
      case "focused":
        // Focused - Show tasks with high focus level
        filters = { focusLevel: "High" };
        break;
      case "distracted":
        // Distracted - Show tasks with both high joy and low focus
        filters = { focusLevel: "Low", joyLevel: "High" };
        break;
      case "tired":
        // Tired - Show tasks with both low focus and low joy
        filters = { focusLevel: "Low", joyLevel: "Low" };
        break;
      default:
        // Default - no filters
        filters = {};
    }

    // Store the selected mood and filters in sessionStorage for retrieval after navigation
    sessionStorage.setItem("wellnessMood", mood);
    sessionStorage.setItem("wellnessFilters", JSON.stringify(filters));

    if (isMobile) {
      setIsWellnessModalOpen(false);
    }

    // Check if we're already on the jobs page
    const currentPath = window.location.pathname;
    if (currentPath === "/jobs") {
      // If already on jobs page, apply filters directly
      window.dispatchEvent(
        new CustomEvent("applyWellnessFilters", {
          detail: { filters, mood },
        }),
      );
    } else {
      // Otherwise navigate to jobs page - filters will be applied on page load
      window.location.href = "/jobs";
    }
  }, [isMobile]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-16 flex items-center">
            {effectiveState !== "collapsed" && (
              <img
                src="/PRIORIWISE_BLUE.png"
                alt="PRIORIWISE"
                className="h-10 w-auto my-4"
              />
            )}
            {effectiveState !== "collapsed" && (
              <SidebarTrigger
                className="ml-auto text-white"
                icon="chevron-left"
              />
            )}
          </SidebarGroupLabel>

          {/* Show symbol and trigger for collapsed desktop only */}
          {!isMobile && effectiveState === "collapsed" && (
            <>
              <img
                src="/PRIORIWISE_SYMBOL.png"
                alt="PRIORIWISE"
                className="h-10 w-auto my-4"
              />
              <div className="flex justify-center mt-2 mb-4">
                <SidebarTrigger
                  className="bg-sidebar text-white shadow-md rounded-full"
                  icon="chevron-right"
                />
              </div>
            </>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard Collapsible Group */}
              <Collapsible className="group/collapsible" defaultOpen={isDashboardSectionActive()}>
                <SidebarMenuItem>
                  {!isMobile && effectiveState === "collapsed" ? (
                    <SidebarMenuButton
                      size={"lg"}
                      asChild
                      className="flex items-center justify-center"
                    >
                      <Link href="/dashboard">
                        <Home className={`mx-auto h-4 w-4 ${isDashboardSectionActive() ? "text-[#F05523]" : ""}`} />
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        size={"lg"}
                        className="flex items-center w-full"
                      >
                        <Link href="/dashboard" className="flex items-center flex-1">
                          <Home className={`mr-2 h-4 w-4 ${isDashboardSectionActive() ? "text-[#F05523]" : ""}`} />
                          <span
                            className={`${
                              isDashboardSectionActive()
                                ? "relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white"
                                : ""
                            }`}
                          >
                            Dashboard
                          </span>
                        </Link>
                        <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  )}
                </SidebarMenuItem>
                {(isMobile || effectiveState !== "collapsed") && (
                  <CollapsibleContent>
                    <SidebarMenu className="pl-6">
                      {dashboardItems.map((item) => {
                        const active = isActive(item.url);
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              size={"lg"}
                              asChild
                              className="flex items-center"
                            >
                              <Link href={item.url}>
                                <item.icon className={active ? "text-[#F05523]" : ""} />
                                <span
                                  className={
                                    active
                                      ? "relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white"
                                      : ""
                                  }
                                >
                                  {item.title}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                )}
              </Collapsible>

              {/* Jobs */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  size={"lg"}
                  asChild
                  className="flex items-center"
                >
                  <Link href="/jobs">
                    <Calendar
                      className={`${isJobsSectionActive() ? "text-[#F05523]" : ""} ${
                        !isMobile && effectiveState === "collapsed" ? "mx-auto" : ""
                      }`}
                    />
                    <span
                      className={`${
                        !isMobile && effectiveState === "collapsed" ? "hidden" : ""
                      } ${
                        isJobsSectionActive()
                          ? "relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white"
                          : ""
                      }`}
                    >
                      Jobs
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Regular menu items */}
              {items.map((item) => {
                const active = isActive(item.url);
                const IconComponent = item.icon;

                return (
                  <SidebarMenuItem key={item.title} id={item.id}>
                    <SidebarMenuButton
                      size={"lg"}
                      asChild
                      className="flex items-center"
                    >
                      <Link href={item.url}>
                        <IconComponent
                          className={`${active ? "text-[#F05523]" : ""} ${
                            !isMobile && effectiveState === "collapsed" ? "mx-auto" : ""
                          }`}
                        />
                        <span
                          className={`${
                            !isMobile && effectiveState === "collapsed" ? "hidden" : ""
                          } ${
                            active
                              ? "relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white"
                              : ""
                          }`}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Backstage Collapsible Group - Only shown if enabled in preferences */}
              {userPreferences.enableBackstage && (
                <Collapsible className="group/collapsible">
                  <SidebarMenuItem>
                    {!isMobile && effectiveState === "collapsed" ? (
                      <SidebarMenuButton
                        size={"lg"}
                        asChild
                        className="flex items-center justify-center"
                      >
                        <Link href="/backstage/qos">
                          <ChartNoAxesCombinedIcon className="mx-auto" />
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          size={"lg"}
                          className="flex items-center w-full"
                        >
                          <ChartNoAxesCombinedIcon className="mr-2" />
                          <span>Backstage</span>
                          <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    )}
                  </SidebarMenuItem>
                  {(isMobile || effectiveState !== "collapsed") && (
                    <CollapsibleContent>
                      <SidebarMenu className="pl-6">
                        {backstageItems.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              size={"lg"}
                              asChild
                              className="flex items-center"
                            >
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {/* Wellness Check Button */}
          <SidebarMenuItem>
            {isMobile ? (
              <SidebarMenuButton
                size={"lg"}
                id="wellness-check"
                className="flex items-center"
                onClick={() => setIsWellnessModalOpen(true)}
              >
                <Heart className="text-purple-500 fill-purple-500" />
                <span>Wellness Check</span>
              </SidebarMenuButton>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton
                    size={"lg"}
                    id="wellness-check"
                    className="flex items-center"
                  >
                    <Heart
                      className={`text-purple-500 fill-purple-500 ${
                        !isMobile && effectiveState === "collapsed" ? "mx-auto" : ""
                      }`}
                    />
                    <span className={!isMobile && effectiveState === "collapsed" ? "hidden" : ""}>
                      Wellness Check
                    </span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-3"
                  side="right"
                  align="start"
                  sideOffset={10}
                >
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      How are you feeling right now?
                    </h4>
                    <p className="text-xs text-gray-500">
                      Choose your mood to get Job suggestions
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button
                        onClick={() => handleWellnessSelection("sad")}
                        className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="text-2xl mb-1">😀</div>
                        <div className="text-xs">Happy</div>
                      </button>
                      <button
                        onClick={() => handleWellnessSelection("focused")}
                        className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="text-2xl mb-1">🤓</div>
                        <div className="text-xs">Focused</div>
                      </button>
                      <button
                        onClick={() => handleWellnessSelection("distracted")}
                        className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="text-2xl mb-1">😵‍💫</div>
                        <div className="text-xs">Distracted</div>
                      </button>
                      <button
                        onClick={() => handleWellnessSelection("tired")}
                        className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="text-2xl mb-1">😴</div>
                        <div className="text-xs">Tired</div>
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </SidebarMenuItem>

          {/* Organization Switcher - show properly in all states */}
          <SidebarMenuItem>
            <OrganizationSwitcher />
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              size={"lg"}
              asChild
              className="flex items-center"
            >
              <Link href="/settings">
                <Settings className={!isMobile && effectiveState === "collapsed" ? "mx-auto" : ""} />
                <span className={!isMobile && effectiveState === "collapsed" ? "hidden" : ""}>
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {isMobile && (
        <Dialog open={isWellnessModalOpen} onOpenChange={setIsWellnessModalOpen}>
          <DialogContent className="sm:max-w-md rounded-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-purple-500 fill-purple-500" />
                Wellness Check
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">
                  How are you feeling right now?
                </h4>
                <p className="text-xs text-gray-500">
                  Choose your mood to get Job suggestions
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleWellnessSelection("sad")}
                  className="p-4 text-center hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="text-3xl mb-2">😀</div>
                  <div className="text-sm font-medium">Happy</div>
                </button>
                <button
                  onClick={() => handleWellnessSelection("focused")}
                  className="p-4 text-center hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="text-3xl mb-2">🤓</div>
                  <div className="text-sm font-medium">Focused</div>
                </button>
                <button
                  onClick={() => handleWellnessSelection("distracted")}
                  className="p-4 text-center hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="text-3xl mb-2">😵‍💫</div>
                  <div className="text-sm font-medium">Distracted</div>
                </button>
                <button
                  onClick={() => handleWellnessSelection("tired")}
                  className="p-4 text-center hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="text-3xl mb-2">😴</div>
                  <div className="text-sm font-medium">Tired</div>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Sidebar>
  );
}