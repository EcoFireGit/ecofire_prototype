"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TourState {
  isActive: boolean;
  hasCompletedTour: boolean;
  currentStep: number;
}

interface OnboardingContextType {
  tourState: TourState;
  startTour: () => void;
  endTour: () => void;
  resetTour: () => void;
  goToStep: (step: number) => void;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

// Create context with null as initial value
const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: OnboardingProviderProps): JSX.Element {
  const [tourState, setTourState] = useState<TourState>({
    isActive: false,
    hasCompletedTour: false,
    currentStep: 0
  });

  useEffect(() => {
    // Check if tour has been completed previously
    const hasCompletedTour = localStorage.getItem('hasCompletedTour') === 'true';
    
    // Get the initial active state from localStorage
    const initialActive = !hasCompletedTour && localStorage.getItem('hasSeenWelcome') !== 'true';
    
    // Only set the tour as active if this is a truly new session
    if (initialActive) {
      console.log("First visit detected, tour will be active initially");
      setTourState({
        isActive: false, // Start inactive, will be activated by welcome modal
        hasCompletedTour: false,
        currentStep: 0
      });
    }
  }, []);

  const startTour = (): void => {
    console.log("🟢 Starting tour from context", new Date().toISOString());
    setTourState({
      isActive: true,
      hasCompletedTour: false,
      currentStep: 0
    });
  };

  const endTour = (): void => {
    console.log("🔴 Ending tour from context", new Date().toISOString());
    setTourState({
      isActive: false,
      hasCompletedTour: true,
      currentStep: 0
    });
    localStorage.setItem('hasCompletedTour', 'true');
  };

  const resetTour = (): void => {
    console.log("🔄 Resetting tour state from context", new Date().toISOString());
    localStorage.removeItem('hasCompletedTour');
    localStorage.removeItem('hasSeenWelcome');
    setTourState({
      isActive: false,
      hasCompletedTour: false,
      currentStep: 0
    });
  };

  const goToStep = (step: number): void => {
    setTourState(prev => ({
      ...prev,
      currentStep: step
    }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        tourState,
        startTour,
        endTour,
        resetTour,
        goToStep
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};