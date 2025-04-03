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
              <Navbar />
              <TaskProvider>{children}</TaskProvider>
            </SignedIn>
            <Toaster />
          </body>
        </html>
      </ViewProvider>
    </ClerkProvider>
  );
}
