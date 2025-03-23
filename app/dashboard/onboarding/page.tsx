
"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessIndustry, setBusinessIndustry] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const router = useRouter();

  const {
    error,
    input,
    status,
    handleInputChange,
    handleSubmit,
    messages,
    reload,
    stop,
    setMessages,
  } = useChat({
    body: { 
      businessName,
      businessIndustry,
      businessDescription
    },
    api: '/api/onboarding',
    onResponse(response) {
      console.log('Response received:', response.status);
      if (!response.ok) {
        console.error('API response not OK:', response.status);
        // We'll let onError handle this
      }
    },
    onFinish(message, { usage, finishReason }) {
      console.log('Usage', usage);
      console.log('FinishReason', finishReason);
      console.log('Message content length:', message.content.length);
      setStep(3); // Show results after completion
    },
    onError(error) {
      console.error('Chat error:', error);
      // Return to step 2 so the user can try again
      setStep(2);
      toast({
        title: "Error",
        description: "An error occurred while processing your business information. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleNextStep = () => {
    if (step === 1 && (!businessName.trim() || !businessIndustry.trim())) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  // Add timeout handling to prevent infinite loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (step === 2.5) {
      // Set a 30-second timeout to revert back to step 2 if no response
      timeoutId = setTimeout(() => {
        console.log("Timeout reached, reverting to step 2");
        setStep(2);
        stop(); // Stop any ongoing streaming
        toast({
          title: "Request Timeout",
          description: "The analysis is taking longer than expected. Please try again.",
          variant: "destructive"
        });
      }, 30000); // 30 seconds timeout
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [step, toast, stop]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a description of your business",
        variant: "destructive"
      });
      return;
    }
    
    // Log to ensure data is correctly formed
    console.log("Submitting form data:", {
      businessName,
      businessIndustry,
      businessDescription
    });
    
    // Set step to indicate processing is happening
    setStep(2.5); // Use a fractional step to indicate "processing"
    
    // Handle form submission - this triggers the API call via useChat
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl pb-48 py-24 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Business Onboarding</h1>

      {/* Step 1: Business Information */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter your business name"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="businessIndustry">Business Industry</Label>
            <Input
              id="businessIndustry"
              value={businessIndustry}
              onChange={(e) => setBusinessIndustry(e.target.value)}
              placeholder="Enter your business industry"
              className="mt-1"
            />
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={handleNextStep}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 2: Business Description */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="businessDescription">Business Description</Label>
            <Textarea
              id="businessDescription"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Describe your business in detail..."
              className="mt-1 h-40"
            />
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={handlePreviousStep} disabled={status === 'streaming'}>
              Back
            </Button>
            <Button 
              onClick={handleFormSubmit} 
              disabled={status === 'streaming' || !businessDescription.trim()}
              className="flex items-center gap-2"
            >
              {status === 'streaming' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'streaming' ? "Analyzing..." : "Submit"}
            </Button>
          </div>
        </div>
      )}
      
      {/* Processing indicator */}
      {step === 2.5 && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Analyzing your business...</p>
          <p className="text-sm text-gray-500">This may take a moment. We're generating strategic recommendations based on your input.</p>
          
          {/* Timeout recovery option */}
          <div className="mt-8">
            <Button 
              variant="outline" 
              onClick={() => {
                setStep(2);
                stop();
                toast({
                  title: "Process cancelled",
                  description: "You can try submitting again with more details.",
                });
              }}
            >
              Cancel and try again
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: AI Response */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Strategic Recommendations</h2>
            
            {/* Display AI response */}
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap">
              {messages.map(m => (
                <div key={m.id} className="whitespace-pre-wrap mb-4">
                  {m.role === 'assistant' && m.content}
                </div>
              ))}
              
              {status === 'streaming' && (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-4">
              <div className="text-red-500">An error occurred.</div>
              <Button
                type="button"
                className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
                onClick={() => reload()}
              >
                Retry
              </Button>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Edit Information
            </Button>
            
            {status === 'streaming' && (
              <Button onClick={stop} variant="destructive">
                Stop Generation
              </Button>
            )}
            
            <Button onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
