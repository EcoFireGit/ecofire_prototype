"use client"

// @/components/onboarding/driver-tour.tsx
import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from './onboarding-context';

interface DriverTourProps {
  onTourEnd?: (error?: boolean) => void;
}

export default function DriverTour({ onTourEnd }: DriverTourProps): React.ReactElement | null {
  const driverRef = useRef<any>(null);
  const { endTour } = useOnboarding();

  useEffect(() => {
    // Wait for DOM to be fully rendered
    const timeoutId = setTimeout(() => {
      // Define tour steps based on your requirements
      const steps: any[] = [
        // Step 1: Jobs & Tasks - looking for Jobs in the sidebar
        {
          element: 'a[href="/dashboard/jobs"], #jobs-tasks-section',
          popover: {
            title: 'Jobs & Tasks',
            description: 'Here you can manage all your tasks and job assignments. This is your central hub for productivity.',
          }
        },
        // Step 2: Wellness Check
        {
          element: '#wellness-check',
          popover: {
            title: 'Wellness Check',
            description: 'Track your wellbeing and set reminders for breaks and wellness activities.',
          }
        },
        // Step 3: Google Calendar Integration
        {
          element: 'a[href="/dashboard/backstage/gcal"], #gcal-integration',
          popover: {
            title: 'Google Calendar',
            description: 'Sync your events with Google Calendar to keep everything in one place.',
          }
        },
        // Step 4: Organization View Toggle
        {
          element: 'a[href="/dashboard/organizations"], #org-view-toggle',
          popover: {
            title: 'Organization View',
            description: 'Switch between different organizational views to see how your team is doing.',
          }
        },
        // Final step - no element, centered on screen
        {
          popover: {
            title: "You're All Set!",
            description: "You've completed the tour. You can restart it anytime from your profile settings.",
          }
        }
      ];

      // Configure driver options - using minimal configuration to avoid issues
      const driverOptions = {
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayClickNext: false, // Don't advance to next step when clicking overlay
        doneBtnText: 'Done',
        
        onDestroyed: () => {
          if (onTourEnd) {
            onTourEnd(false); // No error
          } else {
            endTour();
          }
        },
        
        steps: steps
      };

      // Initialize Driver.js
      try {
        driverRef.current = driver(driverOptions);
        // Start the tour
        driverRef.current.drive();
      } catch (error) {
        console.error("Driver.js initialization error:", error);
        // Fallback: end the tour if there's an error
        if (onTourEnd) {
          onTourEnd(true); // Pass true to indicate error
        } else {
          endTour();
        }
      }
    }, 500); // Short delay to ensure DOM elements are available

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch (error) {
          console.error("Error destroying driver:", error);
        }
      }
    };
  }, [endTour, onTourEnd]);

  return null;
}