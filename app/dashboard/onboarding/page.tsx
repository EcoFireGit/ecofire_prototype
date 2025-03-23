
"use client";

import { useChat } from '@ai-sdk/react';
import { useState } from "react";
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
    onFinish(message, { usage, finishReason }) {
      console.log('Usage', usage);
      console.log('FinishReason', finishReason);
      setStep(3); // Show results after completion
    },
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
