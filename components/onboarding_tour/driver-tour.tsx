"use client";

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
  
  console.log("🚀 Main DriverTour component mounted", new Date().toISOString());

  useEffect(() => {
    // Wait for DOM to be fully rendered
    console.log("⏳ Waiting for DOM to be ready before starting tour", new Date().toISOString());
    const timeoutId = setTimeout(() => {
      console.log("🔍 Searching for tour elements in DOM", new Date().toISOString());
      // Define tour steps based on your requirements
      const steps: any[] = [
        // Step 1: Jobs & Tasks
        {
          element: '#jobs-tasks-section',
          popover: {
            title: 'Jobs & Tasks',
            description: 'Welcome to your zone of genius! Here you can manage all your tasks and job assignments that have already been prioritized for you.'
          }
        },
        // Step 2: Organization View Toggle
        {
          element: '#org-view-toggle',
          popover: {
            title: 'Organization View',
            description: 'Switch between different organizational views to see how your team is doing.',
          }
        },
        // Step 3: jija
        {
          element: '#jija',
          popover: {
            title: 'Jija',
            description: 'Jija is your AI assistant that helps you manage your tasks and jobs.',
          }
        },
        // Step 4: Wellness Check
        {
          element: '#wellness-check',
          popover: {
            title: 'Wellness Check',
            description: 'Reprioritize your jobs based on your mood.',
          }
        },
        // Step 5: Google Calendar Integration -- redirect to gcal page
        {
          element: '#gcal-integration',
          popover: {
            title: 'Google Calendar',
            description: 'Sync your events with Google Calendar to keep everything in one place.',
          }
        },
        
        // Final step - no element, centered on screen
        {
          element: "#help-button",
          popover: {
            title: "You're All Set!",
            description: "You've completed the tour. You can restart it anytime from the help button in your Navbar.",
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
          console.log("🏆 Tour completed or closed manually", new Date().toISOString());
          if (onTourEnd) {
            onTourEnd(false); // No error
          } else {
            endTour();
          }
        },
        
        onDeselected: (element: any) => {
          console.log("👉 Step completed, element deselected:", element?.id || 'unknown', new Date().toISOString());
        },
        
        onHighlighted: (element: any) => {
          console.log("✨ Element highlighted:", element?.id || 'unknown', new Date().toISOString());
        },
        
        steps: steps
      };

      // Initialize Driver.js
      try {
        console.log("🛠️ Initializing Driver.js with configuration", new Date().toISOString());
        console.log("📋 Tour steps:", steps.map(step => step.element || 'final-step'));
        
        driverRef.current = driver(driverOptions);
        // Start the tour
        console.log("🏁 Starting tour with driver.drive()", new Date().toISOString());
        driverRef.current.drive();
      } catch (error) {
        console.error("❌ Driver.js initialization error:", error, new Date().toISOString());
        // Log DOM state for debugging
        console.log("📄 DOM state check:", {
          jobsElement: document.querySelector('a[href="/jobs"], #jobs-tasks-section'),
          wellnessCheck: document.getElementById('wellness-check'),
          gcalElement: document.querySelector('a[href="/backstage/gcal"], #gcal-integration'),
          orgElement: document.querySelector('a[href="/organizations"], #org-view-toggle')
        });
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