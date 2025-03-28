"use client";

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
import { CheckCircle, CheckSquare } from "lucide-react";

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessIndustry, setBusinessIndustry] = useState("");
  const [monthsInBusiness, setMonthsInBusiness] = useState<number | "">("");
  const [annualRevenue, setAnnualRevenue] = useState<number | "">("");
  const [growthStage, setGrowthStage] = useState("");
  const [step, setStep] = useState(1);
  const [growthStageOptions, setGrowthStageOptions] = useState<string[]>([]);
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
    onFinish(result, { usage, finishReason }) {
      console.log("Usage", usage);
      console.log("FinishReason", finishReason);
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
    onFinish(result, { usage, finishReason }) {
      console.log("Jobs usage", usage);
      console.log("Jobs finishReason", finishReason);
      // Add the completion to jobs messages for display
      setJobsMessages([
        ...jobsMessages,
        { role: "assistant", content: result },
      ]);
      // Attempt to parse the JSON response and update jobsData state
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          jsonStr = jsonStr.replace(/'/g, '"');
          const parsedJobsData = JSON.parse(jsonStr);
          setJobsData(parsedJobsData);
        } else {
          setJobsData(null); // Set to null if no JSON is found
        }
      } catch (error) {
        console.error("Error parsing jobs data:", error);
        setJobsData(null); // Set to null if parsing fails
      }
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
  }, []);

  // Display the jobs messages
  const JobsDisplay = () => {
    // Find any structured data (JSON) in the message content
    const findStructuredData = (content: string) => {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          return data;
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
      return null;
    };

    // Helper to render structured job data with tasks
    const renderStructuredJobs = (data: any) => {
      if (!data) return <p>No structured jobs data available</p>;

      return (
        <div className="space-y-6">
          {Object.keys(data).map((key) => {
            const job = data[key];
            return (
              <div
                key={key}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {job.title}
                </h3>
                <p className="text-gray-700 ml-7 mb-3">{job.notes}</p>

                {/* Display tasks for this job */}
                {job.tasks && Array.isArray(job.tasks) && job.tasks.length > 0 ? (
                  <div className="ml-7 mt-2 space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">Tasks:</h4>
                    {job.tasks.map((task: any, index: number) => (
                      <div key={index} className="p-2 pl-3 border-l-2 border-blue-300 bg-blue-50 rounded-sm">
                        <h5 className="text-sm font-medium flex items-center">
                          <CheckSquare className="h-4 w-4 mr-2 text-blue-500" />
                          {task.title}
                        </h5>
                        {task.notes && (
                          <p className="text-xs text-gray-600 ml-6">{task.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    };

    // Use the stored parsed data if available
    if (jobsData) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Jobs To Be Done</h2>
          {renderStructuredJobs(jobsData)}
        </div>
      );
    }

    // Fallback to trying to parse from messages
    const assistantMessage = jobsMessages.find(
      (msg) => msg.role === "assistant"
    );
    const structuredData = assistantMessage
      ? findStructuredData(assistantMessage.content)
      : null;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Jobs To Be Done</h2>
        {jobsMessages.length === 0 ? (
          <div className="p-4 border rounded-lg bg-gray-50">
            <p className="text-gray-500 text-center">
              Jobs will appear here after generation
            </p>
          </div>
        ) : structuredData ? (
          renderStructuredJobs(structuredData)
        ) : (
          <div className="space-y-4">
            {jobsMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-4 border rounded-lg ${
                  msg.role === "assistant"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
            <Label htmlFor="businessDescription">Business Description</Label>
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
              {completion}

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
                        jsonStr = jsonStr.replace(/'/g, '"');
                        const outcomeData = JSON.parse(jsonStr);

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
                                    <p>
                                      <span className="font-medium">
                                        Deadline:
                                      </span>{" "}
                                      {new Date(
                                        outcome.deadline,
                                      ).toLocaleDateString()}
                                    </p>
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

            <Button onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Jobs To Be Done */}
      {step === 4 && <JobsDisplay />}
    </div>
  );
}