"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskFeedView from "@/components/tasks/feed/task-feed-view";
import JobsPage from "@/components/jobs/job-feed-view";
import { useEffect, useState, useRef } from "react";
import { WelcomeModal, TourController } from "@/components/onboarding_tour";
import { OnboardingProvider } from "@/components/onboarding_tour/onboarding-context";
import { useSearchParams, usePathname } from 'next/navigation';

// Import the event name (or define it here if you prefer)
const TOUR_START_EVENT = "directTourStart";

export default function FeedPage() {
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialLoadRef = useRef(true);
  
  // Handle URL parameters on initial load (for page loads and redirects)
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      
      // Check for tour parameter in URL
      const tourParam = searchParams.get('tour');
      const fromOnboarding = pathname === '/jobs' && tourParam === 'true';
      
      // Also check localStorage (for backward compatibility)
      const hasShowWelcomeFlag = localStorage.getItem("showWelcomeModal") === "true";
      
      console.log('Initial tour detection:', { 
        fromUrlParam: !!tourParam, 
        fromLocalStorage: hasShowWelcomeFlag,
        pathname 
      });
      
      if (fromOnboarding || hasShowWelcomeFlag) {
        console.log('Tour needs to be shown on initial load');
        
        // Clear localStorage flags 
        localStorage.removeItem("showWelcomeModal");
        
        // Show welcome modal
        setShowOnboardingTour(true);
      }
    }
  }, [searchParams, pathname]);
  
  // Listen for the direct tour start event (for same-page tour starts)
  useEffect(() => {
    const handleDirectTourStart = () => {
      console.log("🎯 Received direct tour start event - showing welcome modal immediately");
      setShowOnboardingTour(true);
    };
    
    // Add event listener for our custom direct event
    window.addEventListener(TOUR_START_EVENT, handleDirectTourStart);
    
    // Also keep the legacy event listener for backward compatibility
    const handleLegacyTourStart = () => {
      console.log("Received legacy tour start event");
      setShowOnboardingTour(true);
    };
    window.addEventListener("startOnboardingTour", handleLegacyTourStart);
    
    return () => {
      window.removeEventListener(TOUR_START_EVENT, handleDirectTourStart);
      window.removeEventListener("startOnboardingTour", handleLegacyTourStart);
    };
  }, []);
  
  // Handle tour completion or skipping
  const handleCloseWelcomeModal = () => {
    console.log("Welcome modal closed");
    setShowOnboardingTour(false);
  };
  
  return (
    <OnboardingProvider>
      <TourController />
      <Tabs defaultValue="job" className="w-auto ml-5">
        <TabsList id="jobs-tasks-section">
          <TabsTrigger value="job">Job Feed</TabsTrigger>
          <TabsTrigger value="task">Task Feed</TabsTrigger>
        </TabsList>
        <TabsContent value="job">
          <JobsPage />
        </TabsContent>
        <TabsContent value="task">
          <TaskFeedView />
        </TabsContent>
      </Tabs>
      
      {/* Show welcome modal when triggered */}
      {showOnboardingTour && (
        <WelcomeModal 
          forceShow={true} 
          onClose={handleCloseWelcomeModal} 
        />
      )}
    </OnboardingProvider>
  );
}