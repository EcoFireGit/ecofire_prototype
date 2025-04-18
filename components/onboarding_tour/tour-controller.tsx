"use client";

import React, { useEffect } from 'react';
import { useOnboarding } from './onboarding-context';
import DriverTour from './driver-tour';

export default function TourController(): React.ReactElement | null {
  const { tourState, endTour } = useOnboarding();
  
  // Log when component renders
  console.log('TourController rendered, tour active:', tourState.isActive);
  
  // Add a global event listener to handle ESC key for accessibility
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && tourState.isActive) {
        console.log('ESC key pressed, ending tour');
        endTour();
      }
    };
    
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [tourState.isActive, endTour]);

  // Only render the tour component when the tour is active
  if (!tourState.isActive) {
    return null;
  }

  console.log("🔷 Starting tour", new Date().toISOString());
  return <DriverTour onTourEnd={() => endTour()} />;
}