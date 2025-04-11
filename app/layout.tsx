import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/landing_page/navbar";
import { Toaster } from "@/components/ui/toaster";
import { TaskProvider } from "@/hooks/task-context";
import { ViewProvider } from "@/lib/contexts/view-context";
import { OnboardingProvider, TourController } from "@/components/onboarding";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <ViewProvider>
        <html lang="en">
          <body>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <OnboardingProvider>
                <Navbar />
                <TaskProvider>{children}</TaskProvider>
                <TourController />
              </OnboardingProvider>
            </SignedIn>
            <Toaster />
          </body>
        </html>
      </ViewProvider>
    </ClerkProvider>
  );
}
