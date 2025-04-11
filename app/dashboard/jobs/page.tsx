"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskFeedView from "@/components/tasks/feed/task-feed-view";
import JobsPage from "@/components/jobs/job-feed-view";
import { useEffect, useState } from "react";
import { WelcomeModal, TourController } from "@/components/onboarding_tour";
import { OnboardingProvider } from "@/components/onboarding_tour/onboarding-context";
import { useSearchParams, useRouter } from 'next/navigation';

export default function FeedPage() {
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Check for tour parameter in URL
  useEffect(() => {
    const tourParam = searchParams.get('tour');
    
    if (tourParam === 'true') {
      console.log('Tour parameter detected in URL, showing welcome modal');
      
      // Clear the tour parameter from URL to allow restarting the tour later
      // by replacing the current URL with a clean one (without query params)
      // This uses setTimeout to ensure the tour starts before removing the parameter
      setTimeout(() => {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }, 100);
      
      // Reset all relevant flags to ensure tour starts properly
      localStorage.removeItem('hasSeenWelcome');
      localStorage.removeItem('hasCompletedTour');
      
      // Show the welcome modal
      setShowOnboardingTour(true);
    }
  }, [searchParams]); // This will re-run whenever the URL parameters change
  
  // Handle tour completion
  const handleTourEnd = () => {
    console.log("Tour ended or skipped, resetting state");
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
      
      {/* Show welcome modal immediately when triggered */}
      {showOnboardingTour && (
        <WelcomeModal 
          forceShow={true} 
          onClose={handleTourEnd} 
        />
      )}
    </OnboardingProvider>
  );
}