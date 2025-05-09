"use client";

import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from './onboarding-context';
import { useRouter } from 'next/navigation';

interface DriverTourProps {
  onTourEnd?: (error?: boolean) => void;
}

export default function DriverTour({ onTourEnd }: DriverTourProps): React.ReactElement | null {
  const driverRef = useRef<any>(null);
  const { endTour } = useOnboarding();
  const router = useRouter();
  
  console.log("🚀 DriverTour component mounted", new Date().toISOString());

  useEffect(() => {
    console.log("⏳ Waiting for DOM to be ready before starting tour", new Date().toISOString());
    
    const timeoutId = setTimeout(() => {
      console.log("🔍 Searching for tour elements in DOM", new Date().toISOString());
      
      // Define tour steps for main page only
      const mainTourSteps = [
        {
          element: '#jobs-tasks-section',
          popover: {
            title: 'Jobs & Tasks',
            description: 'Welcome to your zone of genius! Here you can manage all your tasks and job assignments that have already been prioritized for you.'
          }
        },
        {
          element: '#org-view-toggle',
          popover: {
            title: 'Organization View',
            description: 'Switch between different organizational views to see how your team is doing.'
          }
        },
        {
          element: '#jija',
          popover: {
            title: 'Jija',
            description: 'Jija is your AI assistant that helps you manage your tasks and jobs.'
          }
        },
        {
          element: '#wellness-check',
          popover: {
            title: 'Wellness Check',
            description: 'Reprioritize your jobs based on your mood.'
          }
        },
        {
          element: '#gcal-integration',
          popover: {
            title: 'Google Calendar',
            description: 'Sync your events with Google Calendar to keep everything in one place.',
            nextBtnText: 'Go to Calendar',
            onNextClick: () => {
              console.log("🔄 Google Calendar button clicked", new Date().toISOString());
              
              // Destroy the tour before redirecting
              if (driverRef.current) {
                driverRef.current.destroy();
              }
              
              // Redirect to gcal page with tour parameter
              window.location.href = '/backstage/gcal?tour=gcal&step=0';
              
              // Return false to prevent default next action
              return false;
            }
          }
        }
      ];

      // Configure driver options for main tour
      const driverOptions = {
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayClickNext: false,
        
        // Track step changes
        onHighlighted: (element: any, step: any, options: any) => {
          const stepIndex = options?.state?.activeIndex || 0;
          console.log(`✨ Main tour step ${stepIndex} highlighted`);
        },
        
        onDestroyed: () => {
          console.log("🏆 Tour completed or closed manually", new Date().toISOString());
          
          // Only end the tour if we aren't in the process of redirecting
          const currentUrl = window.location.href;
          if (!currentUrl.includes('/backstage/gcal')) {
            if (onTourEnd) {
              onTourEnd(false);
            } else {
              endTour();
            }
          }
        },
        
        steps: mainTourSteps
      };

      // Initialize and start the tour
      try {
        console.log("🛠️ Initializing Driver.js with configuration", new Date().toISOString());
        console.log("📋 Tour steps:", mainTourSteps.map(step => step.element));
        
        driverRef.current = driver(driverOptions);
        console.log("🏁 Starting tour with driver.drive()", new Date().toISOString());
        driverRef.current.drive();
      } catch (error) {
        console.error("❌ Driver.js initialization error:", error, new Date().toISOString());
        console.log("📄 DOM state check:", {
          jobsElement: document.querySelector('a[href="/jobs"], #jobs-tasks-section'),
          wellnessCheck: document.getElementById('wellness-check'),
          gcalElement: document.querySelector('a[href="/backstage/gcal"], #gcal-integration'),
          orgElement: document.querySelector('a[href="/organizations"], #org-view-toggle')
        });
        
        if (onTourEnd) {
          onTourEnd(true);
        } else {
          endTour();
        }
      }
    }, 500);

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
  }, [endTour, onTourEnd, router]);

  return null;
}