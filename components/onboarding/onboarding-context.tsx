"use client"

// @/components/onboarding/onboarding-context.tsx
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
    // Check if this is the first visit
    const hasCompletedTour = localStorage.getItem('hasCompletedTour') === 'true';
    const isFirstLogin = localStorage.getItem('isFirstLogin') !== 'false';
    
    if (isFirstLogin) {
      // Mark that this is no longer the first login
      localStorage.setItem('isFirstLogin', 'false');
      
      // Start tour automatically for first-time users
      if (!hasCompletedTour) {
        setTourState({
          isActive: true,
          hasCompletedTour: false,
          currentStep: 0
        });
      }
    }
  }, []);

  const startTour = (): void => {
    setTourState({
      isActive: true,
      hasCompletedTour: false,
      currentStep: 0
    });
  };

  const endTour = (): void => {
    setTourState({
      isActive: false,
      hasCompletedTour: true,
      currentStep: 0
    });
    localStorage.setItem('hasCompletedTour', 'true');
  };

  const resetTour = (): void => {
    localStorage.removeItem('hasCompletedTour');
    localStorage.removeItem('isFirstLogin');
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