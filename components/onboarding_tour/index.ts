// @/components/onboarding/index.ts
export { OnboardingProvider, useOnboarding } from './onboarding-context';
export { default as DriverTour } from './driver-tour';
export { default as TourController } from './tour-controller';
export { default as WelcomeModal } from './welcome-modal';
export { default as StartTourButton } from './start-tour-button';

// This index file makes it easier to import components from the onboarding folder
// For example: import { WelcomeModal, StartTourButton } from '@/components/onboarding';