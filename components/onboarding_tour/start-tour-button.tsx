"use client";

import React from 'react';
import { useOnboarding } from './onboarding-context';

interface StartTourButtonProps {
  className?: string;
  showIcon?: boolean;
}

export default function StartTourButton({ 
  className = '', 
  showIcon = true 
}: StartTourButtonProps): React.ReactElement {
  const { startTour } = useOnboarding();

  return (
    <button 
      className={`tour-button ${className}`}
      onClick={startTour}
      aria-label="Start application tour"
    >
      {showIcon && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="8"></line>
        </svg>
      )}
      Start Tour
    </button>
  );
}