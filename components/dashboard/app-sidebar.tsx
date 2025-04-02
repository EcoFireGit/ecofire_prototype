import { Calendar, Home, Inbox, Search, Settings, Download, Dog, Target, Clipboard, BarChart2, ChevronDown, Users, ClipboardCheck, ChartNoAxesCombinedIcon } from "lucide-react"
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
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>EcoF:re</SidebarGroupLabel>
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
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger className="flex items-center w-full py-2 px-3 text-sm font-medium rounded-md hover:bg-accent">
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