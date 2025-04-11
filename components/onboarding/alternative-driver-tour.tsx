"use client"
// @/components/onboarding/alternative-driver-tour.tsx
import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from './onboarding-context';

interface AlternativeDriverTourProps {
  onTourEnd?: (error?: boolean) => void;
}

export default function AlternativeDriverTour({ onTourEnd }: AlternativeDriverTourProps): null {
  const { endTour } = useOnboarding();

  useEffect(() => {
    // Wait for DOM to be fully rendered
    const timeoutId = setTimeout(() => {
      try {
        // Create a simpler driver configuration
        const driverObj = driver({
          showProgress: true,
          animate: true,
          allowClose: true,
          showButtons: ['next', 'previous', 'close'], // Fix: Use array of button types instead of boolean
         
          steps: [
            // We use more specific selectors for this fallback implementation
            {
              element: '.sidebar-menu a[href="/dashboard/jobs"]',
              popover: {
                title: 'Jobs & Tasks',
                description: 'Here you can manage all your tasks and job assignments.'
              }
            },
            {
              element: '#wellness-check',
              popover: {
                title: 'Wellness Check',
                description: 'Track your wellbeing and set reminders for breaks.'
              }
            },
            {
              element: '.sidebar-menu a[href="/dashboard/backstage/gcal"]',
              popover: {
                title: 'Google Calendar',
                description: 'Sync your events with Google Calendar.'
              }
            },
            {
              element: '.sidebar-menu a[href="/dashboard/organizations"]',
              popover: {
                title: 'Organization View',
                description: 'Switch between different organizational views.'
              }
            },
            {
              popover: {
                title: "You're All Set!",
                description: "You've completed the tour."
              }
            }
          ]
        });

        // Start the tour
        driverObj.drive();

        // Cleanup function
        return () => {
          driverObj.destroy();
        };
      } catch (error) {
        console.error("Error in alternative driver tour:", error);
        if (onTourEnd) {
          onTourEnd(true);
        } else {
          endTour();
        }
        return () => {}; // Empty cleanup
      }
    }, 500); // Short delay for DOM to be ready

    return () => clearTimeout(timeoutId);
  }, [endTour, onTourEnd]);

  return null;
}