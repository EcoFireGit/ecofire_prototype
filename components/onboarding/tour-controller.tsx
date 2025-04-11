"use client"

// @/components/onboarding/tour-controller.tsx
import React, { useEffect, useState } from 'react';
import { useOnboarding } from './onboarding-context';
import DriverTour from './driver-tour';
import AlternativeDriverTour from './alternative-driver-tour';

export default function TourController(): React.ReactElement | null {
  const { tourState, endTour } = useOnboarding();
  const [useFallback, setUseFallback] = useState(false);
  
  // Add a global event listener to handle ESC key for accessibility
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && tourState.isActive) {
        endTour();
      }
    };
    
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [tourState.isActive, endTour]);

  // Handle errors in the main tour component
  const handleTourError = (hasError?: boolean) => {
    if (hasError) {
      console.log("Main tour implementation failed. Switching to alternative implementation.");
      setUseFallback(true);
    } else {
      endTour();
    }
  };

  if (!tourState.isActive) {
    return null;
  }

  // Use fallback component if there was an error with the main one
  if (useFallback) {
    return <AlternativeDriverTour onTourEnd={endTour} />;
  }

  return <DriverTour onTourEnd={handleTourError} />;
}