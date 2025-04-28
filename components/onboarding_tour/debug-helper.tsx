"use client"

// @/components/onboarding/debug-helper.tsx
"use client"

import { useEffect } from 'react';

export function DebugTourElements() {
  useEffect(() => {
    // Add this component to your page to check if tour elements are available
    if (typeof window !== 'undefined') {
      // Wait for DOM to fully load
      setTimeout(() => {
        // Check for key elements used in the tour
        const elements = {
          // Primary selectors
          "jobs (ID)": document.getElementById('jobs-tasks-section'),
          "wellness-check (ID)": document.getElementById('wellness-check'),
          "gcal (ID)": document.getElementById('gcal-integration'),
          "org-view (ID)": document.getElementById('org-view-toggle'),
          
          // Alternative selectors
          "jobs link": document.querySelector('a[href="/jobs"]'),
          "wellness (text)": Array.from(document.querySelectorAll('*')).find(el => 
            el.textContent?.includes('Wellness')),
          "Calendar link": document.querySelector('a[href="/backstage/gcal"]'),
          "Organizations link": document.querySelector('a[href="/organizations"]'),
          
          // Additional context
          "sidebar-menu": document.querySelector('.sidebar-menu'),
          "sidebar": document.querySelector('.sidebar')
        };
        
        console.table(
          Object.entries(elements).reduce((acc, [key, value]) => {
            acc[key] = {
              found: !!value,
              id: value?.id || 'none',
              className: value?.className || 'none',
              tag: value?.tagName || 'none'
            };
            return acc;
          }, {} as Record<string, any>)
        );
        
        console.log("Debug helper report complete. Add this component to check tour elements.");
      }, 1000);
    }
  }, []);

  return null;
}

// Usage:
// Add <DebugTourElements /> to your dashboard or page component
// Check the console for a table showing which elements were found