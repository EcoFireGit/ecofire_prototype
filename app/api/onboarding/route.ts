import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText } from "ai";
import { ChatService } from "@/lib/services/chat.service";
import { MissionService } from "@/lib/services/mission.service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const params = await req.json();
    const {
      businessName,
      businessIndustry,
      businessDescription,
      monthsInBusiness,
      annualRevenue,
      growthStage,
      step = "outcomes", // Default to outcomes step
    } = params;

    if (!businessName || !businessIndustry || !businessDescription) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Missing required business information",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const chatId = crypto.randomUUID(); // Generate a new chat ID for this session
    const chatService = new ChatService();
    const missionService = new MissionService();

    // Update the mission with the business description
    try {
      await missionService.updateMission(businessDescription);
      console.log("Mission updated with business description");
    } catch (missionError) {
      console.error("Error updating mission:", missionError);
      // Continue even if mission update fails
    }

    // Common system prompt for both steps
    const systemPrompt =
      "You are an elite business strategy consultant specializing in guiding startups and small businesses. " +
      'You are consulting a new business owner whose business is named: "' +
      businessName +
      '", which is in the industry of ' +
      businessIndustry +
      (monthsInBusiness !== undefined && monthsInBusiness !== ""
        ? `, has been operating for ${monthsInBusiness} months, `
        : ", ") +
      (annualRevenue !== undefined && annualRevenue !== ""
        ? `, with annual revenues of USD ${annualRevenue}, `
        : ", ") + // Fixed annualRevenue variable (was using monthsInBusiness)
      "and is currently in the " +
      growthStage +
      " stage of growth." +
      'The business mission statement as follows: "' +
      businessDescription +
      '". Provide them with initial strategic recommendations and next steps to establish or grow their business. ' +
      "Be specific, actionable, and empathetic in your response.";

    // Different prompts for each step
    const outcomePrompt =
      'Please suggest the 3 most important outcome metrics for the next 3 months that I can use to track my progress towards accomplishing my mission and distribute 100 points among these outcome metrics as per their importance towards my mission. Output your result in the form of a JSON in the following format: { "outcome1": { "name": "Outcome 1", "targetValue": 100, "deadline": "2025-12-31", "points": 50 } }. Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.';

    const jobsPrompt =
      'Based on the business mission and context, suggest 10 specific jobs to be done (tasks) that would help the business achieve its outcomes. For each task, provide a title, description, and estimate the impact on a scale of 1-10. Output your result in the form of a JSON in the following format: { "job1": { "title": "Job 1 Title", "description": "Description of what needs to be done", "impact": 8 } }. Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.';

    // Set a timeout for the OpenAI API call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("OpenAI API request timed out")),
        25000,
      );
    });

    // Choose which flow to execute based on the step parameter
    if (step === "outcomes") {
      // First step - outcomes
      const result = await Promise.race([
        streamText({
          model: openai("gpt-4o"),
          system: systemPrompt,
          prompt: outcomePrompt,
          async onFinish({ text, usage, finishReason }) {
            // Store chat history
            const messages = [
              { role: "system", content: systemPrompt },
              { role: "user", content: outcomePrompt },
              { role: "assistant", content: text },
            ];
            try {
              await chatService.saveChatHistory(userId, chatId, messages);
              console.log("Chat saved with ID:", chatId);

              // Process and save outcomes
              try {
                // Extract JSON from the response text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  // Get the JSON string and replace any single quotes with double quotes to ensure valid JSON
                  let jsonStr = jsonMatch[0];
                  jsonStr = jsonStr.replace(/'/g, '"');

                  try {
                    const outcomeData = JSON.parse(jsonStr);
                    
                    // Import QBO service
                    const { QBOService } = await import(
                      "@/lib/services/qbo.service"
                    );
                    const qboService = new QBOService();

                    // Save each outcome to QBO table
                    for (const key in outcomeData) {
                      const outcome = outcomeData[key];

                      // Format the date as an actual Date object
                      const deadlineDate = new Date(outcome.deadline);

                      await qboService.createQBO(
                        {
                          name: outcome.name,
                          beginningValue: 0, // Initial value
                          currentValue: 0, // Initial value
                          targetValue: outcome.targetValue,
                          deadline: deadlineDate,
                          points: outcome.points,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                        },
                        userId,
                      );

                      console.log(`QBO created for outcome: ${outcome.name}`);
                    }
                  } catch (error) {
                    console.error(
                      "Error parsing JSON:",
                      error,
                      "Input string:",
                      jsonStr,
                    );
                  }
                } else {
                  console.error("No JSON format found in AI response");
                }
              } catch (parseError) {
                console.error("Error parsing or saving QBO data:", parseError);
              }
            } catch (saveError) {
              console.error("Error saving chat history:", saveError);
            }
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error("API timeout or error:", error.message);
        throw new Error("Request timeout - GPT API is taking too long to respond");
      });

      console.log("Stream response generated, sending back to client");
      return result.toDataStreamResponse();
    } else if (step === "jobs") {
      // Second step - jobs to be done
      const result = await Promise.race([
        streamText({
          model: openai("gpt-4o"),
          system: systemPrompt,
          prompt: jobsPrompt,
          async onFinish({ text, usage, finishReason }) {
            // Store chat history
            const messages = [
              { role: "system", content: systemPrompt },
              { role: "user", content: jobsPrompt },
              { role: "assistant", content: text },
            ];
            try {
              await chatService.saveChatHistory(userId, chatId, messages);
              console.log("Jobs chat saved with ID:", chatId);

              // Process jobs data here if needed (similar to outcomes)
              try {
                // Extract JSON from the response text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  // Get the JSON string and replace any single quotes with double quotes
                  let jsonStr = jsonMatch[0];
                  jsonStr = jsonStr.replace(/'/g, '"');

                  try {
                    const jobsData = JSON.parse(jsonStr);
                    console.log("Jobs data parsed successfully");
                    
                    // Import Job service
                    const { JobService } = await import(
                      "@/lib/services/job.service"
                    );
                    const jobService = new JobService();

                    // Save each job to Job table
                    for (const key in jobsData) {
                      const job = jobsData[key];
                      
                      await jobService.createJob(
                        {
                          title: job.title,
                          description: job.description,
                          impact: job.impact,
                          isDone: false,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                        },
                        userId,
                      );

                      console.log(`Job created: ${job.title}`);
                    }
                  } catch (error) {
                    console.error(
                      "Error parsing jobs JSON:",
                      error,
                      "Input string:",
                      jsonStr,
                    );
                  }
                }
              } catch (parseError) {
                console.error("Error parsing jobs data:", parseError);
              }
            } catch (saveError) {
              console.error("Error saving jobs chat history:", saveError);
            }
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error("API timeout or error:", error.message);
        throw new Error("Request timeout - GPT API is taking too long to respond");
      });

      console.log("Jobs stream response generated, sending back to client");
      return result.toDataStreamResponse();
    } else {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid step parameter",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: any) {
    console.error("Error in onboarding API:", error);

    // Provide a more specific error status and message for timeouts
    const status = error.message?.includes("timeout") ? 504 : 500;
    const message = error.message?.includes("timeout")
      ? "Request timed out - please try again"
      : "Internal Server Error - " + error.message;

    return new Response(
      JSON.stringify({
        error: status === 504 ? "Gateway Timeout" : "Internal Server Error",
        message,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
