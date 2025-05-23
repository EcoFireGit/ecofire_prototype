"use client";

import { Task } from "@/lib/models/task.model";

import { useCompletion } from "@ai-sdk/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dJSON from "dirty-json"; // Import dirty-json library

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessIndustry, setBusinessIndustry] = useState("");
  const [monthsInBusiness, setMonthsInBusiness] = useState<number | "">("");
  const [annualRevenue, setAnnualRevenue] = useState<number | "">("");
  const [growthStage, setGrowthStage] = useState("");
  const [step, setStep] = useState(1);
  const [growthStageOptions, setGrowthStageOptions] = useState<string[]>([]); // Added state for growth stage options
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [jobsMessages, setJobsMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const { toast } = useToast();
  const router = useRouter();

  // Hook for outcomes completion
  const {
    complete,
    completion,
    error,
    isLoading,
    stop,
    input,
    handleInputChange,
    setInput,
  } = useCompletion({
    api: "/api/onboarding",
    onResponse(response) {
      console.log("Response received:", response.status);
      if (!response.ok) {
        console.error("API response not OK:", response.status);
        stop();
        setStep(2);
        toast({
          title: "Error",
          description: `Server error: ${response.status}`,
          variant: "destructive",
        });
      }
    },
    onFinish(result, completion) {
      // console.log("Usage", usage);
      // console.log("FinishReason", finishReason);
      console.log("Result content length:", result.length);
      // Add the completion to messages for display
      setMessages([...messages, { role: "assistant", content: result }]);
      setStep(3); // Show results after completion
    },
    onError(error) {
      console.error("Completion error:", error);
      // Return to step 2 so the user can try again
      setStep(2);
      toast({
        title: "Error",
        description:
          "An error occurred while processing your business information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Second hook for jobs completion
  const {
    complete: completeJobs,
    completion: jobsCompletion,
    error: jobsError,
    isLoading: isJobsLoading,
    stop: stopJobs,
  } = useCompletion({
    id: "jobs-completion",
    api: "/api/onboarding",
    onResponse(response) {
      // console.log("DEBUG: Jobs response: ", response);
      console.log("Jobs response received:", response.status);
      if (!response.ok) {
        console.error("Jobs API response not OK:", response.status);
        stopJobs();
        toast({
          title: "Error",
          description: `Server error: ${response.status}`,
          variant: "destructive",
        });
      }
    },
    onFinish(result, completion) {
      // console.log("Jobs usage", usage);
      // console.log("Jobs finishReason", finishReason);
      // console.log("DEBUG: Jobs result JSON:", result); // Added debugging output
      // Add the completion to jobs messages for display
      setJobsMessages([
        ...jobsMessages,
        { role: "assistant", content: result },
      ]);
    },
    onError(error) {
      console.error("Jobs completion error:", error);
      toast({
        title: "Error",
        description:
          "An error occurred while generating jobs. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Third hook for PI completion
  const {
    complete: completePIs,
    completion: piCompletion,
    error: piError,
    isLoading: isPILoading,
    stop: stopPIs,
  } = useCompletion({
    id: "pi-completion",
    api: "/api/onboarding",
    onResponse(response) {
      console.log("PIs response received:", response.status);
      if (!response.ok) {
        console.error("PIs API response not OK:", response.status);
        stopPIs();
        toast({
          title: "Error",
          description: `Server error: ${response.status}`,
          variant: "destructive",
        });
      }
    },
    onFinish(result, completion) {
      console.log("PI generation completed");
      // Don't redirect yet, will do job-PI mappings next
    },
    onError(error) {
      console.error("PIs completion error:", error);
      toast({
        title: "Error",
        description:
          "An error occurred while generating Outputs, but you can still return to dashboard.",
        variant: "destructive",
      });
      // Redirect to jobs page instead of dashboard
      router.push("/jobs?tour=true");
    },
  });

  // Fourth hook for Job-PI mappings completion
  const {
    complete: completeMappings,
    completion: mappingsCompletion,
    error: mappingsError,
    isLoading: isMappingsLoading,
    stop: stopMappings,
  } = useCompletion({
    id: "mappings-completion",
    api: "/api/onboarding",
    onResponse(response) {
      console.log("Mappings response received:", response.status);
      if (!response.ok) {
        console.error("Mappings API response not OK:", response.status);
        stopMappings();
        toast({
          title: "Error",
          description: `Server error: ${response.status}`,
          variant: "destructive",
        });
      }
    },
    onFinish(result, completion) {
      console.log("Job-PI mappings generation completed");
      // Continue to PI-QBO mappings step
    },
    onError(error) {
      console.error("Mappings completion error:", error);
      toast({
        title: "Error",
        description:
          "An error occurred while generating Job-Output mappings, but you can still return to dashboard.",
        variant: "destructive",
      });
      // Redirect to jobs page instead of dashboard
      router.push("/jobs?tour=true");
    },
  });

  // Fifth hook for PI-QBO mappings completion
  const {
    complete: completePiQboMappings,
    completion: piQboMappingsCompletion,
    error: piQboMappingsError,
    isLoading: isPiQboMappingsLoading,
    stop: stopPiQboMappings,
  } = useCompletion({
    id: "pi-qbo-mappings-completion",
    api: "/api/onboarding",
    onResponse(response) {
      console.log("PI-QBO Mappings response received:", response.status);
      if (!response.ok) {
        console.error("PI-QBO Mappings API response not OK:", response.status);
        stopPiQboMappings();
        toast({
          title: "Error",
          description: `Server error: ${response.status}`,
          variant: "destructive",
        });
      }
    },
    onFinish(result, completion) {
      console.log("PI-QBO mappings generation completed");
      // After PI-QBO mappings are completed, redirect to jobs page
      // We'll handle job impact calculation in the handleReturnToDashboard function
      router.push("/jobs?tour=true");
    },
    onError(error) {
      console.error("PI-QBO Mappings completion error:", error);
      toast({
        title: "Error",
        description:
          "An error occurred while generating Output-Outcome mappings, but you can still return to dashboard.",
        variant: "destructive",
      });
      // Redirect to jobs page instead of dashboard
      router.push("/jobs?tour=true");
    },
  });

  // Handler for "Create Jobs To Be Done" button
  const handleCreateJobs = async () => {
    setStep(4); // Move to the jobs step

    try {
      // Call the API with the step parameter set to "jobs"
      await completeJobs("", {
        body: {
          businessName: businessName.trim(),
          businessIndustry: businessIndustry.trim(),
          businessDescription: input.trim(),
          monthsInBusiness:
            monthsInBusiness === "" ? 0 : Number(monthsInBusiness),
          annualRevenue: annualRevenue,
          growthStage: growthStage,
          step: "jobs", // Indicate this is the jobs step
        },
      });
    } catch (err) {
      console.error("Error during jobs generation:", err);
      toast({
        title: "Jobs Generation Error",
        description: "There was a problem generating jobs. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReturnToDashboard = async () => {
    // Set the flag to trigger the welcome modal and tour
    // Add the 'tour=true' parameter directly to the URL instead of just using localStorage
    // Show a toast to inform the user that PIs are being generated
    toast({
      title: "Generating Outputs",

      description: "Please wait while we create Outputs based on your jobs...",
    });

    try {
      // Call the API with the step parameter set to "pis"
      await completePIs("", {
        body: {
          businessName: businessName.trim(),
          businessIndustry: businessIndustry.trim(),
          businessDescription: input.trim(),
          monthsInBusiness:
            monthsInBusiness === "" ? 0 : Number(monthsInBusiness),
          annualRevenue: annualRevenue,
          growthStage: growthStage,
          step: "pis", // Indicate this is the PIs step
        },
      });

      // After PIs are generated, generate Job-PI mappings
      toast({
        title: "Generating Jobs-Outputs Mappings",
        description:
          "Please wait while we create mappings between Jobs and Outputs...",
      });

      // Call the API with the step parameter set to "mappings"
      await completeMappings("", {
        body: {
          businessName: businessName.trim(),
          businessIndustry: businessIndustry.trim(),
          businessDescription: input.trim(),
          monthsInBusiness:
            monthsInBusiness === "" ? 0 : Number(monthsInBusiness),
          annualRevenue: annualRevenue,
          growthStage: growthStage,
          step: "mappings", // Indicate this is the mappings step
        },
      });

      // After Job-PI mappings are generated, generate PI-QBO mappings
      toast({
        title: "Generating Outputs-Outcomes Mappings",

        description:
          "Please wait while we create mappings between Outputs and Outcomes...",
      });

      // Call the API with the step parameter set to "pi-qbo-mappings"
      await completePiQboMappings("", {
        body: {
          businessName: businessName.trim(),
          businessIndustry: businessIndustry.trim(),
          businessDescription: input.trim(),
          monthsInBusiness:
            monthsInBusiness === "" ? 0 : Number(monthsInBusiness),
          annualRevenue: annualRevenue,
          growthStage: growthStage,
          step: "pi-qbo-mappings", // Indicate this is the PI-QBO mappings step
        },
      });

      // Calculate job impact values before redirecting
      try {
        const response = await fetch("/api/jobs/calculate-impact", {
          method: "POST",
        });
        const result = await response.json();
        if (result.success) {
          console.log("Job impact values updated successfully");
        }
      } catch (error) {
        console.error("Error updating job impact values:", error);
      }

      // After all mappings are generated, redirect to jobs page
      router.push("/jobs?tour=true");
    } catch (err) {
      console.error("Error during PI or mapping generation:", err);
      toast({
        title: "Generation Error",
        description:
          "There was a problem generating Outputs or mappings, but you can still return to dashboard.",
        variant: "destructive",
      });
      // Redirect to jobs page instead of dashboard with the onboarding tour
      router.push("/jobs?tour=true");
    }
  };

  const handleNextStep = () => {
    if (
      step === 1 &&
      (!businessName.trim() || !businessIndustry.trim() || !growthStage.trim())
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
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
      // Set a 35-second timeout to revert back to step 2 if no response
      timeoutId = setTimeout(() => {
        console.log("Timeout reached, reverting to step 2");
        setStep(2);
        stop(); // Stop any ongoing streaming
        toast({
          title: "Request Timeout",
          description:
            "The analysis is taking longer than expected. Please try again with a more concise description.",
          variant: "destructive",
        });
      }, 35000); // 35 seconds timeout - slightly longer than the backend timeout
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [step, toast, stop]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a description of your business",
        variant: "destructive",
      });
      return;
    }

    // Check if the business description is too long, which might cause timeouts
    if (input.length > 3000) {
      toast({
        title: "Description Too Long",
        description:
          "Please keep your business description under 3000 characters to avoid timeouts.",
        variant: "destructive",
      });
      return;
    }

    // Log to ensure data is correctly formed
    console.log("Submitting form data:", {
      businessName: businessName.trim(),
      businessIndustry: businessIndustry.trim(),
      businessDescription: input.substring(0, 100) + "...", // Log truncated for readability
    });

    // Set step to indicate processing is happening
    setStep(2.5); // Use a fractional step to indicate "processing"

    // Add user input to messages for display
    setMessages([...messages, { role: "user", content: input }]);

    try {
      // Update business info in database
      const updateResponse = await fetch("/api/business-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missionStatement: input.trim(),
          name: businessName.trim(),
          industry: businessIndustry.trim(),
          monthsInBusiness:
            monthsInBusiness === "" ? 0 : Number(monthsInBusiness),
          annualRevenue: annualRevenue === "" ? 0 : Number(annualRevenue),
          growthStage: growthStage,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update business information");
      }

      // Call the complete function with business data
      await complete(input, {
        body: {
          businessName: businessName.trim(),
          businessIndustry: businessIndustry.trim(),
          businessDescription: input.trim(),
          monthsInBusiness:
            monthsInBusiness === "" ? 0 : Number(monthsInBusiness),
          annualRevenue: annualRevenue,
          growthStage: growthStage,
        },
      });
    } catch (err) {
      console.error("Error during form submission:", err);
      setStep(2);
      toast({
        title: "Submission Error",
        description:
          "There was a problem submitting your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Set hardcoded growth stage options
    setGrowthStageOptions([
      "Pre-seed",
      "Seed",
      "Early",
      "Growth",
      "Expansion",
      "Mature",
      "custom",
    ]);

    async function fetchBusinessInfo() {
      try {
        const response = await fetch("/api/business-info");
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            // Pre-populate fields with existing business info
            setBusinessName(data.name || "");
            setBusinessIndustry(data.industry || "");
            setMonthsInBusiness(data.monthsInBusiness || 0);
            setAnnualRevenue(data.annualRevenue || 0);
            setGrowthStage(data.growthStage || "");
            setInput(data.missionStatement || "");
          }
        }
      } catch (error) {
        console.error("Error fetching business info:", error);
        toast({
          title: "Error",
          description: "Failed to load business information",
          variant: "destructive",
        });
      }
    }

    fetchBusinessInfo();
  }, []);

  return (
    <div className="flex flex-col w-full max-w-4xl pb-48 p-10 mx-auto">
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
              required
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
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="monthsInBusiness">
              Number of months in business
            </Label>
            <Input
              id="monthsInBusiness"
              type="number"
              value={monthsInBusiness}
              onChange={(e) =>
                setMonthsInBusiness(
                  e.target.value === "" ? 0 : Number(e.target.value),
                )
              }
              placeholder="0"
              min="0"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="annualRevenue">Annual Revenue</Label>
            <Input
              id="annualRevenue"
              type="number"
              value={annualRevenue}
              onChange={(e) =>
                setAnnualRevenue(
                  e.target.value === "" ? 0 : Number(e.target.value),
                )
              }
              placeholder="Enter your annual revenue"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="growthStage">Growth Stage</Label>
            {growthStage === "custom" ||
            (growthStage && !growthStageOptions.includes(growthStage)) ? (
              <div className="space-y-2">
                <Input
                  id="customGrowthStage"
                  value={growthStage === "custom" ? "" : growthStage}
                  onChange={(e) => setGrowthStage(e.target.value || "custom")}
                  placeholder="Enter custom growth stage"
                  required
                  className="mt-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGrowthStage("Pre-seed")}
                >
                  Use dropdown options instead
                </Button>
              </div>
            ) : (
              <Select value={growthStage} onValueChange={setGrowthStage}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Growth Stage" />
                </SelectTrigger>
                <SelectContent>
                  {growthStageOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Label htmlFor="businessDescription">
              Business Mission Statement
            </Label>
            <Textarea
              id="businessDescription"
              value={input}
              onChange={handleInputChange}
              placeholder="Describe your business Mission Statement."
              className="mt-1 h-40"
            />
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={isLoading || !input.trim()}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Analyzing..." : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {step === 2.5 && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Analyzing your business...</p>
          <p className="text-sm text-gray-500">
            This may take a moment. We're generating strategic recommendations
            based on your input.
          </p>

          {/* Timeout recovery option */}
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setStep(2);
                stop();
                toast({
                  title: "Process cancelled",
                  description:
                    "You can try submitting again with more details.",
                });
              }}
            >
              Cancel and try again
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: AI Response with Outcomes */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700 text-sm font-medium">
              Your business description has been saved as your mission
              statement. You can edit it anytime from the dashboard.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              Strategic Recommendations - Outcomes
            </h2>

            {/* Display AI outcomes response */}
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap">
              {/*completion*/}

              {isLoading && (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {!isLoading && completion && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-2">
                    Business Outcomes
                  </h3>
                  {(() => {
                    try {
                      // Try to extract and parse the JSON
                      const jsonMatch = completion.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        let jsonStr = jsonMatch[0];
                        const outcomeData = dJSON.parse(jsonStr);
                        return (
                          <div className="space-y-4">
                            {Object.keys(outcomeData).map((key) => {
                              const outcome = outcomeData[key];
                              return (
                                <div
                                  key={key}
                                  className="bg-white p-3 rounded-md border border-gray-300"
                                >
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-bold">
                                      {outcome.name}
                                    </h4>
                                    <span className="text-blue-600 font-medium">
                                      {outcome.points} points
                                    </span>
                                  </div>
                                  <div className="mt-2 text-sm">
                                    <p>
                                      <span className="font-medium">
                                        Target:
                                      </span>{" "}
                                      {outcome.targetValue}
                                    </p>
                                    <div className="mb-3 text-sm text-gray-700">
                                      <p>{outcome.notes}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error(
                        "Error parsing outcome data for display:",
                        e,
                      );
                    }
                    return (
                      <p className="text-gray-500">
                        No structured outcome data available
                      </p>
                    );
                  })()}
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
                onClick={() => {
                  setStep(2);
                  setInput(input); // Preserve the input
                }}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setStep(2)}>
              Edit Information
            </Button>

            {!isLoading && !error && (
              <Button
                onClick={handleCreateJobs}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Create Jobs To Be Done
              </Button>
            )}

            {isLoading && (
              <Button onClick={stop} variant="destructive">
                Stop Generation
              </Button>
            )}

            <Button onClick={handlePreviousStep}>
              Go back to previous step
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Jobs To Be Done */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700 text-sm font-medium">
              Here are the recommended jobs to help you achieve your business
              outcomes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              Recommended Jobs To Be Done
            </h2>

            {/* Display AI jobs response */}
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap">
              {/*jobsCompletion*/}

              {isJobsLoading && (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {!isJobsLoading && jobsCompletion && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-2">Recommended Jobs</h3>
                  {(() => {
                    try {
                      // Try to extract and parse the JSON
                      const jsonMatch = jobsCompletion.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        let jsonStr = jsonMatch[0];
                        // Using dirty-json for parsing instead of manual fixing
                        const jobsData = dJSON.parse(jsonStr);
                        return (
                          <div className="space-y-6">
                            {Object.keys(jobsData).map((key) => {
                              const job = jobsData[key];
                              return (
                                <div
                                  key={key}
                                  className="bg-white p-4 rounded-md border border-gray-300"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-lg">
                                      {job.title}
                                    </h4>
                                  </div>
                                  <div className="mb-3 text-sm text-gray-700">
                                    <p>{job.notes}</p>
                                  </div>

                                  {/* Display tasks if they exist */}
                                  {job.tasks &&
                                    Array.isArray(job.tasks) &&
                                    job.tasks.length > 0 && (
                                      <div className="mt-3">
                                        <h5 className="font-semibold text-sm mb-2 text-gray-700">
                                          Tasks:
                                        </h5>
                                        <div className="pl-4 border-l-2 border-gray-200 space-y-2">
                                          {job.tasks.map(
                                            (task: Task, index: number) => (
                                              <div
                                                key={index}
                                                className="bg-gray-50 p-2 rounded"
                                              >
                                                <p className="font-medium text-sm">
                                                  {task.title}
                                                </p>
                                                {task.notes && (
                                                  <p className="text-xs text-gray-600 mt-1">
                                                    {task.notes}
                                                  </p>
                                                )}
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error("Error parsing jobs data for display:", e);
                      // Show the error for easier debugging
                      return (
                        <div>
                          <p className="text-red-500">
                            Error parsing jobs data: {(e as Error).message}
                          </p>
                          <p className="text-gray-500 mt-2">
                            Try refreshing the page or returning to the previous
                            step.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <p className="text-gray-500">
                        No structured jobs data available
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {jobsError && (
            <div className="mt-4">
              <div className="text-red-500">
                An error occurred generating jobs.
              </div>
              <Button variant="outline" onClick={handleCreateJobs}>
                Retry
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              Back to Outcomes
            </Button>

            {isJobsLoading && (
              <Button onClick={stopJobs} variant="destructive">
                Stop Generation
              </Button>
            )}

            <Button
              onClick={handleReturnToDashboard}
              disabled={
                isJobsLoading ||
                isPILoading ||
                isMappingsLoading ||
                isPiQboMappingsLoading
              }
              className="flex items-center gap-2"
            >
              {(isJobsLoading ||
                isPILoading ||
                isMappingsLoading ||
                isPiQboMappingsLoading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isJobsLoading
                ? "Generating Jobs..."
                : isPILoading
                  ? "Generating Outputs..."
                  : isMappingsLoading
                    ? "Generating Jobs-Outputs Mappings..."
                    : isPiQboMappingsLoading
                      ? "Generating Outputs-Outcomes Mappings..."
                      : "Go to Jobs feed"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
