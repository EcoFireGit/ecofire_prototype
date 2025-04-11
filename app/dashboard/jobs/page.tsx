"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskFeedView from "@/components/tasks/feed/task-feed-view";
import JobsPage from "@/components/jobs/job-feed-view";
import { useEffect, useState } from "react";
import { WelcomeModal, TourController } from "@/components/onboarding_tour";
import { OnboardingProvider } from "@/components/onboarding_tour/onboarding-context";

export default function FeedPage() {
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  useEffect(() => {
    // Check if we've been redirected from the onboarding page
    const comingFromOnboarding =
      localStorage.getItem("showWelcomeModal") === "true";

    if (comingFromOnboarding) {
      console.log("Detected redirect from onboarding, showing welcome modal");

      // Reset the flags to ensure the welcome modal shows and starts the tour
      localStorage.removeItem("showWelcomeModal");
      localStorage.setItem("hasSeenWelcome", "false");
      localStorage.setItem("hasCompletedTour", "false");

      // Use a slight delay to ensure DOM is ready before showing the modal
      setTimeout(() => {
        setShowOnboardingTour(true);
      }, 500);
    }
  }, []);
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
      {/* Force the welcome modal to appear if coming from onboarding */}
      {showOnboardingTour && <WelcomeModal forceShow={true} />}
    </OnboardingProvider>
  );
}
