import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { openai } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText } from "ai";
import { BusinessInfoService } from "@/lib/services/business-info.service";
import crypto from "crypto";
import dJSON from "dirty-json"; // Import dirty-json library

// Function to generate a date 3 months from today
function getDateThreeMonthsFromNow(): Date {
  const today = new Date();
  // Set to 3 months from now
  const threeMonthsFromNow = new Date(today);
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  return threeMonthsFromNow;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await validateAuth();

    if (!authResult.isAuthorized) {
      return authResult.response;
    }

    const userId = authResult.userId;

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
    const businessInfoService = new BusinessInfoService();

    // Update the business info with the business description as mission statement
    try {
      await businessInfoService.updateBusinessInfo(userId!, {
        missionStatement: businessDescription,
      });
      console.log("Business info updated with mission statement");
    } catch (updateError) {
      console.error("Error updating business info:", updateError);
      // Continue even if business info update fails
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
      'Please suggest the 3 most important outcome metrics for the next 3 months that I can use to track my progress towards accomplishing my mission and distribute 100 points among these outcome metrics as per their importance towards my mission. Output your result in the form of a JSON in the following format: { "outcome1": { "name": "Outcome 1", "targetValue": 100, "deadline": "2025-12-31", "points": 50 } }. The deadline will be automatically set to 3 months from today, so you can use any valid date format. Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.';

    const jobsPrompt =
      'Please generate the 10 most important jobs to be done in my business for achieving my mission statement. For each job, also generate up to 3 specific tasks that need to be completed to accomplish that job. Output your result in the form of a JSON in the following format: { "job1": { "title": "Job 1 Title", "notes": "Description of what needs to be done", "tasks": [{"title": "Task 1 Title", "notes": "Description of the task"}, {"title": "Task 2 Title", "notes": "Description of the task"}, {"title": "Task 3 Title", "notes": "Description of the task"}] } }. Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.';

    const pisPrompt =
      'Considering all of my jobs to be done, what are all the 5 most important quantifiable metrics I can use to track my progress on each of them? It is not necessary for every job to be done to be associated with a unique metric. Avoid outcome metrics. Output your result in the form of a JSON in the following format: { "pi1": { "name": "PI 1", "targetValue": 100, "deadline": "2025-12-31"} }. The deadline will be automatically set to 3 months from today, so you can use any valid date format. Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.';

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
          model: openai("gpt-4-turbo"),
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
                // Get the JSON string
                let jsonStr = jsonMatch[0];

                try {
                  // Use dirty-json to parse the string instead of manual fixing
                  const outcomeData = dJSON.parse(jsonStr);

                  // Import QBO service
                  const { QBOService } = await import(
                    "@/lib/services/qbo.service"
                  );
                  const qboService = new QBOService();

                  // Save each outcome to QBO table
                  for (const key in outcomeData) {
                    const outcome = outcomeData[key];

                    // Always set deadline to 3 months from today
                    const deadlineDate = getDateThreeMonthsFromNow();

                    // Check if QBO with same name already exists
                    const existingQBOs = await qboService.getAllQBOs(userId!);
                    const existingQBO = existingQBOs.find(
                      (qbo) => qbo.name === outcome.name,
                    );

                    if (existingQBO) {
                      // Update the existing QBO
                      await qboService.updateQBO(existingQBO._id, userId!, {
                        targetValue: outcome.targetValue,
                        deadline: deadlineDate,
                        points: outcome.points,
                        notes: `Updated during onboarding for ${businessName}`,
                      });
                      console.log(`QBO updated for outcome: ${outcome.name}`);
                    } else {
                      // Create a new QBO
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
                        userId!,
                      );
                      console.log(`QBO created for outcome: ${outcome.name}`);
                    }
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
      return (result as any).toDataStreamResponse(); // Type assertion here
    } else if (step === "jobs") {
      // Second step - jobs to be done
      const result = await Promise.race([
        streamText({
          model: openai("gpt-4-turbo"),
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
                // Get the JSON string
                let jsonStr = jsonMatch[0];

                try {
                  // Use dirty-json to parse the string instead of manual fixing
                  const jobsData = dJSON.parse(jsonStr);
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

                  // Get all existing jobs
                  const existingJobs = await jobService.getAllJobs(userId!);

                  // Save each job to Job table and create associated tasks
                  for (const key in jobsData) {
                    const job = jobsData[key];

                    // Check if job with same title already exists
                    const existingJob = existingJobs.find(
                      (j) => j.title === job.title,
                    );
                    let jobId;

                    if (existingJob) {
                      // Use the existing job
                      jobId = existingJob._id;
                      console.log(`Job already exists: ${job.title}`);

                      // Update the job notes if needed
                      await jobService.updateJob(jobId, userId!, {
                        notes: `Updated during onboarding for ${businessName}`,
                      });

                      // Clear existing tasks to replace with new ones
                      if (existingJob.tasks && existingJob.tasks.length > 0) {
                        // Optional: Delete existing tasks if you want to replace them
                        // For this implementation, we'll keep existing tasks
                      }
                    } else {
                      // Create the job first
                      const createdJob = await jobService.createJob(
                        {
                          title: job.title,
                          isDone: false,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                          tasks: [], // Initialize empty tasks array
                        },
                        userId!,
                      );

                      jobId = createdJob._id;
                      console.log(`Job created: ${job.title}`);
                    }

                    // If the job has tasks, create them
                    if (
                      job.tasks &&
                      Array.isArray(job.tasks) &&
                      job.tasks.length > 0
                    ) {
                      const taskIds = [];

                      // Create each task for this job
                      for (const taskData of job.tasks) {
                        // For existing jobs, we could check if similar tasks exist
                        // but for simplicity, we'll just add new tasks
                        const task = await taskService.createTask(
                          {
                            title: taskData.title,
                            notes: taskData.notes || `Task for ${job.title}`,
                            jobId: jobId, // Associate with the job
                            completed: false,
                          },
                          userId!,
                        );

                        taskIds.push(task._id);
                        console.log(
                          `Task created: ${taskData.title} for job: ${job.title}`,
                        );
                      }

                      // Update the job with the task IDs
                      if (taskIds.length > 0) {
                        // For existing jobs, we append the new tasks to any existing ones
                        const jobToUpdate = existingJobs.find(
                          (j) => j._id === jobId,
                        );
                        const existingTaskIds = jobToUpdate?.tasks || [];
                        const allTaskIds = [...existingTaskIds, ...taskIds];

                        await jobService.updateJob(jobId, userId!, {
                          tasks: allTaskIds,
                          // Set the first task as the next task if no next task is set
                          nextTaskId: jobToUpdate?.nextTaskId || taskIds[0],
                        });
                        console.log(
                          `Updated job ${job.title} with ${taskIds.length} new tasks`,
                        );
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
      return (result as any).toDataStreamResponse(); // Type assertion here
    } else if (step === "pis") {
      // Third step - Progress Indicators (PIs)
      const result = await Promise.race([
        streamText({
          model: openai("gpt-4-turbo"),
          system: systemPrompt,
          prompt: pisPrompt,
          async onFinish({ text, usage, finishReason }) {
            console.log("PIs processing");

            // Process and save PIs
            try {
              // Extract JSON from the response text
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                // Get the JSON string
                let jsonStr = jsonMatch[0];

                try {
                  // Use dirty-json to parse the string instead of manual fixing
                  const piData = dJSON.parse(jsonStr);

                  // Import PI service
                  const { PIService } = await import(
                    "@/lib/services/pi.service"
                  );
                  const piService = new PIService();

                  // Get existing PIs to check for duplicates
                  const existingPIs = await piService.getAllPIs(userId!);

                  // Save each PI
                  for (const key in piData) {
                    const pi = piData[key];

                    // Always set deadline to 3 months from today
                    const deadlineDate = getDateThreeMonthsFromNow();

                    // Check if PI with same name already exists
                    const existingPI = existingPIs.find(
                      (existingPI) => existingPI.name === pi.name,
                    );

                    if (existingPI) {
                      // Update the existing PI
                      await piService.updatePI(existingPI._id, userId!, {
                        targetValue: pi.targetValue,
                        deadline: deadlineDate,
                        notes: `Updated during onboarding for ${businessName}`,
                      });
                      console.log(`PI updated: ${pi.name}`);
                    } else {
                      // Create a new PI
                      await piService.createPI(
                        {
                          name: pi.name,
                          beginningValue: 0, // Initial value
                          targetValue: pi.targetValue,
                          deadline: deadlineDate,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                        },
                        userId!,
                      );
                      console.log(`PI created: ${pi.name}`);
                    }
                  }

                  // Job impact calculation removed as requested
                } catch (error) {
                  console.error(
                    "Error parsing PI JSON:",
                    error,
                    "Input string:",
                    jsonStr,
                  );
                }
              } else {
                console.error("No JSON format found in AI response for PIs");
              }
            } catch (parseError) {
              console.error("Error parsing or saving PI data:", parseError);
            }
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error("API timeout or error for PIs:", error.message);
        throw new Error(
          "Request timeout - GPT API is taking too long to respond",
        );
      });

      console.log("PIs stream response generated, sending back to client");
      return (result as any).toDataStreamResponse(); // Type assertion here
    } else if (step === "mappings") {
      // Fourth step - Generate Job-PI Mappings
      // First, fetch all jobs and PIs to provide to the AI
      const { JobService } = await import("@/lib/services/job.service");
      const { PIService } = await import("@/lib/services/pi.service");
      const jobService = new JobService();
      const piService = new PIService();

      let jobs = await jobService.getAllJobs(userId!);
      let pis = await piService.getAllPIs(userId!);

      // Create a context string with jobs and PIs information for the AI
      const jobsContext = jobs
        .map((job) => `Job ID: ${job._id}, Title: ${job.title}`)
        .join("\n");
      const pisContext = pis
        .map(
          (pi) =>
            `PI ID: ${pi._id}, Name: ${pi.name}, Target Value: ${pi.targetValue}`,
        )
        .join("\n");

      // Create a custom prompt for mapping generation
      const mappingsPrompt =
        `Based on the mission statement of the business and the following Jobs and Progress Indicators (PIs), create mappings between jobs and PIs that make sense. ` +
        `\n\nJOBS:\n${jobsContext}\n\nPROGRESS INDICATORS:\n${pisContext}\n\n` +
        `Generate mappings between jobs and PIs where each job must impact one or more PIs. ` +
        `For each mapping, you need to specify how much impact a job has on a specific PI using a piImpactValue. ` +
        `The piImpactValue should not exceed the targetValue for that PI. ` +
        `CRITICAL REQUIREMENT: You MUST ensure that EVERY job from the list is mapped to at least one PI, and every PI has at least one job mapped to it. ` +
        `Double-check your output to verify that no job is left unmapped. If necessary, create logical connections between jobs and PIs based on their relationship to the business mission. ` +
        `Before finalizing, count the unique job IDs in your mappings and ensure it matches the total number of jobs in the input. ` +
        `Output your result in the form of a JSON in the following format: ` +
        `{ "mapping1": { "jobId": "job-id-here", "jobName": "Job Title Here", "piId": "pi-id-here", "piName": "PI Name Here", "piImpactValue": 10, "piTarget": pi-target-value-here } }. ` +
        `Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.`;

      const result = await Promise.race([
        streamText({
          model: openai("gpt-4-turbo"),
          system: systemPrompt,
          prompt: mappingsPrompt,
          async onFinish({ text, usage, finishReason }) {
            console.log("Mappings processing");

            // Process and save mappings
            try {
              // Extract JSON from the response text
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                // Get the JSON string
                let jsonStr = jsonMatch[0];

                try {
                  // Use dirty-json to parse the string instead of manual fixing
                  const mappingsData = dJSON.parse(jsonStr);

                  // Import MappingService
                  const { MappingService } = await import(
                    "@/lib/services/pi-job-mapping.service"
                  );
                  const mappingService = new MappingService();

                  // Get existing mappings to check for duplicates
                  const existingMappings =
                    await mappingService.getAllMappingJP(userId!);

                  // Save each mapping
                  for (const key in mappingsData) {
                    const mapping = mappingsData[key];

                    // Check if mapping with same jobId and piId already exists
                    const existingMapping = existingMappings.find(
                      (m) =>
                        m.jobId === mapping.jobId && m.piId === mapping.piId,
                    );

                    if (existingMapping) {
                      // Update the existing mapping
                      await mappingService.updateMappingJP(
                        existingMapping._id,
                        userId!,
                        {
                          piImpactValue: mapping.piImpactValue,
                          piTarget: mapping.piTarget,
                          notes: `Updated during onboarding for ${businessName}`,
                        },
                      );
                      console.log(
                        `Mapping updated: ${mapping.jobName} -> ${mapping.piName}`,
                      );
                    } else {
                      // Create a new mapping
                      await mappingService.CreateMapping(
                        {
                          jobId: mapping.jobId,
                          jobName: mapping.jobName,
                          piId: mapping.piId,
                          piName: mapping.piName,
                          piImpactValue: mapping.piImpactValue,
                          piTarget: mapping.piTarget,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                        },
                        userId!,
                      );
                      console.log(
                        `Mapping created: ${mapping.jobName} -> ${mapping.piName}`,
                      );
                    }
                  }
                } catch (error) {
                  console.error(
                    "Error parsing Mappings JSON:",
                    error,
                    "Input string:",
                    jsonStr,
                  );
                }
              } else {
                console.error(
                  "No JSON format found in AI response for Mappings",
                );
              }
            } catch (parseError) {
              console.error(
                "Error parsing or saving mapping data:",
                parseError,
              );
            }
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error("API timeout or error for Mappings:", error.message);
        throw new Error(
          "Request timeout - GPT API is taking too long to respond",
        );
      });

      console.log("Mappings stream response generated, sending back to client");
      return (result as any).toDataStreamResponse(); // Type assertion here
    } else if (step === "pi-qbo-mappings") {
      // Fifth step - Generate PI-QBO Mappings
      // First, fetch all PIs and QBOs to provide to the AI
      const { PIService } = await import("@/lib/services/pi.service");
      const { QBOService } = await import("@/lib/services/qbo.service");
      const piService = new PIService();
      const qboService = new QBOService();

      let pis = await piService.getAllPIs(userId!);
      let qbos = await qboService.getAllQBOs(userId!);

      // Create a context string with PIs and QBOs information for the AI
      const pisContext = pis
        .map(
          (pi) =>
            `PI ID: ${pi._id}, Name: ${pi.name}, Target Value: ${pi.targetValue}`,
        )
        .join("\n");
      const qbosContext = qbos
        .map(
          (qbo) =>
            `QBO ID: ${qbo._id}, Name: ${qbo.name}, Target Value: ${qbo.targetValue}`,
        )
        .join("\n");

      // Create a custom prompt for PI-QBO mapping generation
      const piQboMappingsPrompt =
        `Based on the mission statement of the business and the following Progress Indicators (PIs) and Quarterly Business Objectives (QBOs), create mappings between PIs and QBOs that make sense. ` +
        `\n\nPROGRESS INDICATORS:\n${pisContext}\n\nQUARTERLY BUSINESS OBJECTIVES:\n${qbosContext}\n\n` +
        `Generate mappings between PIs and QBOs where each PI must impact one or more QBOs. ` +
        `For each mapping, you need to specify how much impact a PI has on a specific QBO using a qboImpact. ` +
        `The value for qboImpact should not exceed the targetValue for that QBO. ` +
        `IMPORTANT: Ensure that EVERY PI is mapped to at least one QBO, and every QBO has at least one PI mapped to it. ` +
        `Do not leave any PI unmapped. If necessary, create logical connections between PIs and QBOs based on their relationship to the business mission. ` +
        `Output your result in the form of a JSON in the following format: ` +
        `{ "mapping1": { "piId": "pi-id-here", "piName": "PI Name Here", "qboId": "qbo-id-here", "qboName": "QBO Name Here", "piTarget": pi-target-value-here, "qboTarget": qbo-target-value-here, "qboImpact": 10 } }. ` +
        `Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.`;

      const result = await Promise.race([
        streamText({
          model: openai("gpt-4-turbo"),
          system: systemPrompt,
          prompt: piQboMappingsPrompt,
          async onFinish({ text, usage, finishReason }) {
            console.log("PI-QBO Mappings processing");

            // Process and save PI-QBO mappings
            try {
              // Extract JSON from the response text
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                // Get the JSON string
                let jsonStr = jsonMatch[0];

                try {
                  // Use dirty-json to parse the string instead of manual fixing
                  const mappingsData = dJSON.parse(jsonStr);

                  // Import PIQBOMappingService
                  const { PIQBOMappingService } = await import(
                    "@/lib/services/pi-qbo-mapping.service"
                  );
                  const piQboMappingService = new PIQBOMappingService();

                  // Get existing mappings to check for duplicates
                  const existingMappings =
                    await piQboMappingService.getAllMappings(userId!);

                  // Save each mapping
                  for (const key in mappingsData) {
                    const mapping = mappingsData[key];

                    // Check if mapping with same piId and qboId already exists
                    const existingMapping = existingMappings.find(
                      (m) =>
                        m.piId === mapping.piId && m.qboId === mapping.qboId,
                    );

                    if (existingMapping) {
                      // Update the existing mapping
                      await piQboMappingService.updateMapping(
                        existingMapping._id,
                        userId!,
                        {
                          piTarget: mapping.piTarget,
                          qboTarget: mapping.qboTarget,
                          qboImpact: mapping.qboImpact,
                          notes: `Updated during onboarding for ${businessName}`,
                        },
                      );
                      console.log(
                        `PI-QBO Mapping updated: ${mapping.piName} -> ${mapping.qboName}`,
                      );
                    } else {
                      // Create a new mapping
                      await piQboMappingService.createMapping(
                        {
                          piId: mapping.piId,
                          qboId: mapping.qboId,
                          piName: mapping.piName,
                          qboName: mapping.qboName,
                          piTarget: mapping.piTarget,
                          qboTarget: mapping.qboTarget,
                          qboImpact: mapping.qboImpact,
                          notes: `Auto-generated from onboarding for ${businessName}`,
                        },
                        userId!,
                      );
                      console.log(
                        `PI-QBO Mapping created: ${mapping.piName} -> ${mapping.qboName}`,
                      );
                    }
                  }
                } catch (error) {
                  console.error(
                    "Error parsing PI-QBO Mappings JSON:",
                    error,
                    "Input string:",
                    jsonStr,
                  );
                }
              } else {
                console.error(
                  "No JSON format found in AI response for PI-QBO Mappings",
                );
              }
            } catch (parseError) {
              console.error(
                "Error parsing or saving PI-QBO mapping data:",
                parseError,
              );
            }
          },
        }),
        timeoutPromise,
      ]).catch((error) => {
        console.error(
          "API timeout or error for PI-QBO Mappings:",
          error.message,
        );
        throw new Error(
          "Request timeout - GPT API is taking too long to respond",
        );
      });

      console.log(
        "PI-QBO Mappings stream response generated, sending back to client",
      );
      return (result as any).toDataStreamResponse(); // Type assertion here
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
