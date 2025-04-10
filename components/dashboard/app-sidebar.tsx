"use client"

import { Calendar, Home, Inbox, Search, Settings, Download, Dog, Target, Clipboard, BarChart2, ChevronDown, Users, ClipboardCheck, ChartNoAxesCombinedIcon, BriefcaseBusinessIcon, Heart } from "lucide-react"
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
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"
import { OrganizationSwitcher } from "./organization-switcher"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCallback } from "react"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Onboarding",
    url: "/dashboard/onboarding",
    icon: ClipboardCheck,
  },
  {
    title: "Quick Guide",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: Calendar,
  },
  {
    title: "Business Functions",
    url: "/dashboard/business-functions",
    icon: Search,
  },
  {
    title: "Business Info",
    url: "/dashboard/business-info",
    icon: BarChart2,
  },
  {
    title: "Team",
    url: "/dashboard/owners",
    icon: Users,
  },
  {
    title: "Jija",
    url: "/dashboard/jija",
    icon: Dog,
  },
  {
    title: "Search",
    url: "/dashboard/search",
    icon: Search,
  },
  {
    title: "Organizations",
    url: "/dashboard/organizations",
    icon: BriefcaseBusinessIcon,
  }
]

// Backstage sub-items
const backstageItems = [
  {
    title: "PI & QBO Mapping",
    url: "/dashboard/backstage/mappings",
    icon: Target,
  },
  {
    title: "QBO Board",
    url: "/dashboard/backstage/qos",
    icon: Clipboard,
  },
  {
    title: "PI Board",
    url: "/dashboard/backstage/pis",
    icon: BarChart2,
  },
]

export function AppSidebar() {
  // Function to handle emoji selection and apply filters
  const handleWellnessSelection = useCallback((mood: any) => {
    // Construct the filters object based on the mood
    let filters = {};
    
    switch (mood) {
      case 'sad':
        // Sad - Show tasks with high joy level (to cheer up)
        filters = { joyLevel: 'High' };
        break;
      case 'focused':
        // Focused - Show tasks with high focus level
        filters = { focusLevel: 'High' };
        break;
      case 'distracted':
        // Distracted - Show tasks with both high joy and low focus
        filters = { focusLevel: 'Low', joyLevel: 'High' };
        break;
      case 'tired':
        // Tired - Show tasks with both low focus and low joy
        filters = { focusLevel: 'Low', joyLevel: 'Low' };
        break;
      default:
        // Default - no filters
        filters = {};
    }
    
    // Store the selected mood and filters in sessionStorage for retrieval after navigation
    sessionStorage.setItem('wellnessMood', mood);
    sessionStorage.setItem('wellnessFilters', JSON.stringify(filters));
    
    // Check if we're already on the jobs page
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard/jobs') {
      // If already on jobs page, apply filters directly
      window.dispatchEvent(new CustomEvent('applyWellnessFilters', { 
        detail: { filters, mood } 
      }));
    } else {
      // Otherwise navigate to jobs page - filters will be applied on page load
      window.location.href = '/dashboard/jobs';
    }
  }, []);
  
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-16">
            <img src="/PRIORIWISE_ECOFIRE_WHITE.png" alt="PRIORIWISE" className="h-10 w-auto my-4">
            </img>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton size={"lg"} asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Backstage Collapsible Group */}
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger className="flex items-center w-full py-2 px-3 text-sm font-medium rounded-md hover:bg-accent hover:text-sidebar-accent-foreground">
                    <ChartNoAxesCombinedIcon className="mr-2 h-4 w-4" />
                    <span>Backstage</span>
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent>
                  <SidebarMenu className="pl-6">
                    {backstageItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton size={"lg"} asChild>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
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
                <SidebarMenuButton size={"lg"}>
                  <Heart className="text-purple-500 fill-purple-500" />
                  <span>Wellness Check</span>
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="right" align="start" sideOffset={10}>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">How are you feeling today?</h4>
                  <p className="text-xs text-gray-500">Choose your mood to get Job suggestions</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button 
                      onClick={() => handleWellnessSelection('sad')}
                      className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <div className="text-2xl mb-1">😔</div>
                      <div className="text-xs">Sad</div>
                    </button>
                    <button 
                      onClick={() => handleWellnessSelection('focused')}
                      className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <div className="text-2xl mb-1">🤓</div>
                      <div className="text-xs">Focused</div>
                    </button>
                    <button 
                      onClick={() => handleWellnessSelection('distracted')}
                      className="p-3 text-center hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <div className="text-2xl mb-1">😵‍💫</div>
                      <div className="text-xs">Distracted</div>
                    </button>
                    <button 
                      onClick={() => handleWellnessSelection('tired')}
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
          <SidebarMenuItem>
                <OrganizationSwitcher />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size={"lg"} asChild>
              <a href="#">
                <Settings />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size={"lg"} asChild>
              <a href="#">
                <Download />
                <span>Business Success Plan</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}