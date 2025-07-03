"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsPage from "@/components/dashboard/basicSetting";
import AdvancedSettingPage from "@/components/dashboard/advancedSetting";
import CalendarPage from "@/components/dashboard/calendarPage";
import { useEffect, useState, useRef } from "react";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Import the event name (or define it here if you prefer)

export default function FeedPage() {

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialLoadRef = useRef(true);
  
  // Handle URL parameters on initial load (for page loads and redirects)
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      
    
    }
  }, [searchParams, pathname]);
  
  // Listen for the direct tour start event (for same-page tour starts)
  
  
  // Handle tour completion or skipping
  
  const router = useRouter();


  // Read tab param from URL, fallback to 'job'
  const tabParam = searchParams.get('tab') || 'basicsetting';
  const [activeTab, setActiveTab] = useState(tabParam);

  // Keep state in sync with URL
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // When tab changes, update URL param
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`);
  };


  return (
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto ml-5">
        <TabsList id="jobs-tasks-section">
          <TabsTrigger value="basicsetting">Basic Settings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="advancedsetting">Advanced Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="basicsetting">
          <SettingsPage/>
        </TabsContent>
        <TabsContent value="calendar">
        <CalendarPage/>
        </TabsContent>
        <TabsContent value="advancedsetting">
        <AdvancedSettingPage/>
        </TabsContent>
      </Tabs>
      

  );
}