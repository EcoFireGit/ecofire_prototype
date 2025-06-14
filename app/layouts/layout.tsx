import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import Navbar from "@/components/landing_page/navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
      <main className="w-full max-w-full">
        <Navbar/>
        {children}
      </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
