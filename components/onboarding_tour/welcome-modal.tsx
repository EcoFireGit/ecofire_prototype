"use client";

import React, { useState, useEffect } from 'react';
import { useOnboarding } from './onboarding-context';

// Add a prop to force the modal to show regardless of localStorage state
interface WelcomeModalProps {
  forceShow?: boolean;
}

export default function WelcomeModal({ forceShow = false }: WelcomeModalProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState<boolean>(forceShow);
  const { startTour } = useOnboarding();
  
  useEffect(() => {
    // Update visibility if forceShow prop changes
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    // Check if this is the first login and welcome hasn't been shown
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    
    if (!hasSeenWelcome) {
      console.log("👋 Welcome modal: first time visitor detected", new Date().toISOString());
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleStartTour = (): void => {
    console.log("👋 Welcome modal: starting tour", new Date().toISOString());
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsVisible(false);
    
    // Small timeout before starting tour to ensure modal is closed
    setTimeout(() => {
      console.log("👋 Welcome modal: calling startTour() after delay", new Date().toISOString());
      startTour();
    }, 100);
  };

  const handleSkipTour = (): void => {
    console.log("⏭️ Welcome modal: skipping tour", new Date().toISOString());
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('hasCompletedTour', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  // The key styling changes are here - making sure the modal displays as a centered popup
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in duration-300">
        <h2 className="text-2xl font-bold mb-4">Welcome to Your Workspace!</h2>
        <p className="mb-6 text-gray-600">
          We're excited to have you here. Would you like a quick tour to get familiar with our features?
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            onClick={handleSkipTour}
          >
            Skip for Now
          </button>
          <button 
            className="px-4 py-2 bg-[#242E65] text-white rounded-md hover:bg-[#242E65]/90 transition-colors"
            onClick={handleStartTour}
          >
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
}