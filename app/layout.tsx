"use client";
import React, { useState } from "react";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/landing_page/navbar";
import { Toaster } from "@/components/ui/toaster";
import { TaskProvider } from "@/hooks/task-context";
import { ViewProvider } from "@/lib/contexts/view-context";
import { Analytics } from '@vercel/analytics/next';

// Simple hash function for demonstration
function simpleHash(str: string): string {
  let hash = 0,
    i,
    chr;
  if (!str) {
    throw new Error("NEXT_PUBLIC_COHORT_PASSWORD must be a valid string");
  }
  if (str.length === 0) return hash.toString();
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString();
}

const PASSWORD_HASH_KEY = "app_pw_hash";
const REQUIRED_PASSWORD = process.env.NEXT_PUBLIC_COHORT_PASSWORD; // Set your password here

// Initialize localStorage (client-side only)
if (typeof window !== "undefined" && !localStorage.getItem(PASSWORD_HASH_KEY)) {
  localStorage.setItem(PASSWORD_HASH_KEY, simpleHash(REQUIRED_PASSWORD!));
}

function PasswordGate({ children }: { children: React.ReactNode }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
    if (simpleHash(input) === storedHash) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password");
      setInput("");
    }
  };

  if (!unlocked) {
    return (
      <div className="password-gate">
        <form onSubmit={handleSubmit}>
          <h3>Access Required</h3>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter access password"
            autoComplete="current-password"
          />
          <button type="submit">Continue</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

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
              <main className="split-landing">
                {/* Left marketing side remains unchanged */}

                <section className="split-left">
                  <div className="welcome">
                    <img
                      src="/PRIORIWISE_BLUE_NOBG.png"
                      alt="Prioriwise Logo"
                      className="logo"
                    />
                    <h1 className="title">
                      Welcome to <span className="brand">Prioriwise!</span>
                    </h1>
                    <p className="subtitle">
                      Boost your productivity and focus on what truly matters.
                      <br />
                      <span className="highlight">
                        Ready to transform the way you work?
                      </span>
                    </p>
                    <p className="description">
                      Let's get started!
                      <br />
                      Please start by signing in!
                    </p>
                  </div>
                  <div className="testimonials">
                    <div className="bubble" style={{ top: "%", left: "40%" }}>
                      Helps me stay mission-focused!
                    </div>
                    <div className="bubble" style={{ top: "30%", left: "60%" }}>
                      Asana on steroids!
                    </div>
                    <div className="bubble" style={{ top: "35%", left: "15%" }}>
                      Boosted my efficiency instantly
                    </div>
                    <div className="bubble" style={{ top: "65%", left: "65%" }}>
                      My to-do list got way less overwhelming!
                    </div>
                    <div className="bubble" style={{ top: "70%", left: "20%" }}>
                      So so easy!
                    </div>
                    <div className="bubble" style={{ top: "90%", left: "40%" }}>
                      Finally, a tool that understands!
                    </div>
                    <img
                      style={{ top: "20%", left: "50%" }}
                      src="/LANDING_PAGE_NOBG.png"
                      alt="Meditating mascot"
                      className="mascot"
                    />
                  </div>
                </section>

                {/* Right sign-in side with password gate */}
                <section className="split-right">
                  <PasswordGate>
                    <div className="signin-box">
                      <h2>Sign in</h2>
                      <p className="signin-subtitle">
                        Login to access your Jobs
                      </p>
                      <SignInButton>
                        <button className="sign-in-btn">
                          Sign in to the app
                        </button>
                      </SignInButton>
                    </div>
                  </PasswordGate>
                </section>
              </main>
            </SignedOut>
            <SignedIn>
              <Navbar />
              <TaskProvider>{children}</TaskProvider>
            </SignedIn>
            <Toaster />
            <Analytics />
          </body>
        </html>
      </ViewProvider>
    </ClerkProvider>
  );
}
