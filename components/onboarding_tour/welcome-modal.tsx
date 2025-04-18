"use client";

import React, { useState, useEffect } from 'react';
import { useOnboarding } from './onboarding-context';

// Add props for better state management
interface WelcomeModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export default function WelcomeModal({ 
  forceShow = false,
  onClose
}: WelcomeModalProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState<boolean>(forceShow);
  const { startTour } = useOnboarding();
  
  useEffect(() => {
    // Update visibility if forceShow prop changes
    setIsVisible(forceShow);
  }, [forceShow]);

  const handleStartTour = (): void => {
    console.log("👋 Welcome modal: starting tour", new Date().toISOString());
    
    // Set only hasSeenWelcome, but NOT hasCompletedTour
    // This allows the tour to run while recording that the welcome modal was seen
    localStorage.setItem('hasSeenWelcome', 'true');
    
    // Close the modal
    setIsVisible(false);
    
    // Notify parent component
    if (onClose) {
      onClose();
    }
    
    // Small timeout before starting tour to ensure modal is closed
    setTimeout(() => {
      console.log("👋 Welcome modal: calling startTour() after delay", new Date().toISOString());
      startTour();
    }, 100);
  };

  const handleSkipTour = (): void => {
    console.log("⏭️ Welcome modal: skipping tour", new Date().toISOString());
    
    // Set both flags to prevent tour and welcome modal from showing again
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('hasCompletedTour', 'true');
    
    // Close the modal
    setIsVisible(false);
    
    // Notify parent component
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) {
    return null;
  }

  // The key styling changes are here - making sure the modal displays as a centered popup
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in duration-300">
        <h2 className="text-2xl font-bold mb-4">Welcome to Prioriwise!</h2>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={handleStartTour}
          >
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
}