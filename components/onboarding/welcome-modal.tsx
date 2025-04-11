"use client";

// @/components/onboarding/welcome-modal.tsx
import React, { useState, useEffect } from 'react';
import { useOnboarding } from './onboarding-context';

export default function WelcomeModal(): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { startTour } = useOnboarding();
  
  useEffect(() => {
    // Check if this is the first login and welcome hasn't been shown
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    
    if (!hasSeenWelcome) {
      // Small delay to ensure the DOM is ready
      const timeoutId = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const handleStartTour = (): void => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsVisible(false);
    
    // Small timeout before starting tour to ensure modal is closed
    setTimeout(() => {
      startTour();
    }, 100);
  };

  const handleSkipTour = (): void => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('hasCompletedTour', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <h1>Welcome to Prioriwise!</h1>
        <p>We're excited to have you here. Would you like a quick tour to get familiar with our features?</p>
        
        <div className="welcome-buttons">
          <button 
            className="primary-button"
            onClick={handleStartTour}
          >
            Start Tour
          </button>
          <button 
            className="secondary-button"
            onClick={handleSkipTour}
          >
            Skip for Now
          </button>
        </div>
        
        <div className="welcome-footer">
          <small>You can always start the tour later from your profile settings</small>
        </div>
      </div>
    </div>
  );
}