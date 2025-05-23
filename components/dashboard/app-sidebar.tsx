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
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Quick Guide",
    url: "https://coda.io/@urvashi-batra/prioriwise-getting-started-guide",
    target: "_blank",
    rel: "noopener noreferrer",
    icon: Inbox,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: Calendar,
  },
  {
    title: "Business Functions",
    url: "/business-functions",
    icon: BriefcaseBusinessIcon,
  },
  {
    title: "Business Info",
    url: "/business-info",
    icon: BarChart2,
  },
  {
    title: "Jija",
    url: "/jija",
    icon: PawPrint,
    id: "jija",
  },
  {
    title: "Organizations",
    url: "/organizations",
    icon: Users,
  },
  {
    title: "Calendar",
    url: "/backstage/gcal",
    icon: Calendar,
    id: "gcal-integration",
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
  const { state } = useSidebar();

  // Function to check if a menu item is active
  const isActive = (url: string) => {
    // Handle exact match for dashboard or startsWith for other routes
    if (url === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(url);
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
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-16 flex items-center">
            {state !== "collapsed" && (
              <img
                src="/PRIORIWISE_BLUE.png"
                alt="PRIORIWISE"
                className="h-10 w-auto my-4"
              ></img>
            )}
            {state !== "collapsed" && (
              <SidebarTrigger
                className="ml-auto text-white"
                icon="chevron-left"
              />
            )}
          </SidebarGroupLabel>

          {/* Centered chevron below logo when collapsed */}
          {state === "collapsed" && (
            <img
              src="/PRIORIWISE_SYMBOL.png"
              alt="PRIORIWISE"
              className="h-10 w-auto my-4"
            ></img>
          )}
          {state === "collapsed" && (
            <div className="flex justify-center mt-2 mb-4">
              <SidebarTrigger
                className="bg-sidebar text-white shadow-md rounded-full"
                icon="chevron-right"
              />
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
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
                      <Link href={item.url} target={item.target} rel={item.rel}>
                        <IconComponent
                          className={`${active ? "text-[#F05523]" : ""} ${state === "collapsed" ? "mx-auto" : ""}`}
                        />
                        <span
                          className={`${state === "collapsed" ? "hidden" : ""} ${
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
                    {state === "collapsed" ? (
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
                      <CollapsibleTrigger className="flex items-center w-full py-2 px-3 text-sm font-medium rounded-md hover:bg-accent hover:text-sidebar-accent-foreground">
                        <ChartNoAxesCombinedIcon className="mr-2 h-4 w-4" />
                        <span>Backstage</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    )}
                  </SidebarMenuItem>
                  {state !== "collapsed" && (
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
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  size={"lg"}
                  id="wellness-check"
                  className="flex items-center"
                >
                  <Heart
                    className={`text-purple-500 fill-purple-500 ${state === "collapsed" ? "mx-auto" : ""}`}
                  />
                  <span className={state === "collapsed" ? "hidden" : ""}>
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
          </SidebarMenuItem>
          {state !== "collapsed" && (
            <SidebarMenuItem>
              <OrganizationSwitcher />
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              size={"lg"}
              asChild
              className="flex items-center"
            >
              <Link href="/dashboard/settings">
                <Settings className={state === "collapsed" ? "mx-auto" : ""} />
                <span className={state === "collapsed" ? "hidden" : ""}>
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
