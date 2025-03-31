import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText } from "ai";
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

    const chatId = crypto.randomUUID(); // Generate a new chat ID for this session (still needed for reference)
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
      'Please generate the 10 most important jobs to be done in my business for achieving my mission statement. For each job, also generate up to 3 specific tasks that need to be completed to accomplish that job. Output your result in the form of a JSON in the following format: { "job1": { "title": "Job 1 Title", "notes": "Description of what needs to be done", "tasks": [{"title": "Task 1 Title", "notes": "Description of the task"}, {"title": "Task 2 Title", "notes": "Description of the task"}, {"title": "Task 3 Title", "notes": "Description of the task"}] } }. Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.';

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
            // Chat history saving removed
            console.log("Outcomes processing - chat history saving removed");

            // Process and save outcomes
              try {
                // Extract JSON from the response text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  // Get the JSON string and fix potential issues
                  let jsonStr = jsonMatch[0];
                  // Replace single quotes with double quotes
                  jsonStr = jsonStr.replace(/'/g, '"');
                  // Fix escaped quotes in strings (like word"s)
                  jsonStr = jsonStr.replace(/(\w)"(\w)/g, '$1\'$2');
                  
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
            // Error handling for chat history saving removed
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error("API timeout or error:", error.message);
        throw new Error(
          "Request timeout - GPT API is taking too long to respond",
        );
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
            // Chat history saving removed
            console.log("Jobs processing - chat history saving removed");

            // Process jobs data here if needed (similar to outcomes)
              try {
                // Extract JSON from the response text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  // Get the JSON string and fix potential issues
                  let jsonStr = jsonMatch[0];
                  // Replace single quotes with double quotes
                  jsonStr = jsonStr.replace(/'/g, '"');
                  // Fix escaped quotes in strings (like word"s)
                  jsonStr = jsonStr.replace(/(\w)"(\w)/g, '$1\'$2');
                  
                  try {
                    const jobsData = JSON.parse(jsonStr);
                    console.log("Jobs data parsed successfully");

                    // Import Job service
                    const { JobService } = await import(
                      "@/lib/services/job.service"
                    );
                    const jobService = new JobService();

                    // Import Task service
                    const { TaskService } = await import(
                      "@/lib/services/task.service"
                    );
                    const taskService = new TaskService();

                    // Save each job to Job table and create associated tasks
                    for (const key in jobsData) {
                      const job = jobsData[key];
                      
                      // Create the job first
                      const createdJob = await jobService.createJob(
                        {
                          title: job.title,
                          isDone: false,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                          tasks: [], // Initialize empty tasks array
                        },
                        userId,
                      );

                      console.log(`Job created: ${job.title}`);
                      
                      // If the job has tasks, create them
                      if (job.tasks && Array.isArray(job.tasks) && job.tasks.length > 0) {
                        const taskIds = [];
                        
                        // Create each task for this job
                        for (const taskData of job.tasks) {
                          const task = await taskService.createTask(
                            {
                              title: taskData.title,
                              notes: taskData.notes || `Task for ${job.title}`,
                              jobId: createdJob._id, // Associate with the job
                              completed: false,
                            },
                            userId,
                          );
                          
                          taskIds.push(task._id);
                          console.log(`Task created: ${taskData.title} for job: ${job.title}`);
                        }
                        
                        // Update the job with the task IDs
                        if (taskIds.length > 0) {
                          await jobService.updateJob(
                            createdJob._id,
                            userId,
                            {
                              tasks: taskIds,
                              // Set the first task as the next task
                              nextTaskId: taskIds[0]
                            }
                          );
                          console.log(`Updated job ${job.title} with ${taskIds.length} tasks`);
                        }
                      }
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
            // Error handling for jobs chat history saving removed
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error("API timeout or error:", error.message);
        throw new Error(
          "Request timeout - GPT API is taking too long to respond",
        );
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
