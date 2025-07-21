
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { JobService } from "@/lib/services/job.service";
import { ChatService } from "@/lib/services/chat.service";
import { BusinessInfoService } from "@/lib/services/business-info.service";
import { validateAuth } from "@/lib/utils/auth-utils";
import { MappingService } from "@/lib/services/pi-job-mapping.service";
import { PIQBOMappingService } from "@/lib/services/pi-qbo-mapping.service";
import { QBOService } from "@/lib/services/qbo.service";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the data from the body of the request
  const body = await req.json();
  console.log("[Jija Debug] /api/chat POST called. Body:", body);
  const { messages, id, source, jobId, taskId, jobTitle } = body;
  const chatId = id || crypto.randomUUID(); // Use provided ID or generate a new one

  // Get user ID from auth
  const authResult = await validateAuth();
      
      if (!authResult.isAuthorized) {
        return authResult.response;
      }
      
      const userId = authResult.userId;

  // Get mission statement from business-info
  const businessInfoService = new BusinessInfoService();
  const businessInfo = await businessInfoService.getBusinessInfo(userId!);
  const missionStatement = businessInfo?.missionStatement || "";

  const systemPrompt_initial =
    'You are an elite business strategy consultant with decades of experience across multiple industries, specializing in guiding startups and small businesses from ideation through scaling. You are advising an entrepreneur whose business mission statement is "' +
    missionStatement +
    '" based on cross-industry best practices. This entrepreneur has a list of jobs to be done as follows:\n';
  const jobService = new JobService();
  const allJobs = await jobService.getAllJobs(userId!);
  const undoneJobs = allJobs
    .filter((job) => !job.isDone)
    .map((job) => job.title)
    .map((item) => `* ${item}`)
    .join("\n");
  //console.log("chat id", id);
  let systemPrompt = systemPrompt_initial + undoneJobs;
  if (jobTitle) {
    systemPrompt += `\n\nThe user is currently asking about: "${jobTitle}".`;
  }

  // If invoked from a task, enrich with task, job, and outcomes context
  if (source === "task" && taskId) {
    try {
      const taskService = new (require("@/lib/services/task.service").TaskService)();
      const jobService = new (require("@/lib/services/job.service").JobService)();
      const mappingService = new (require("@/lib/services/pi-job-mapping.service").MappingService)();
      const piQboMappingService = new (require("@/lib/services/pi-qbo-mapping.service").PIQBOMappingService)();
      const qboService = new (require("@/lib/services/qbo.service").QBOService)();
      const task = await taskService.getTaskById(taskId, userId);
      if (task) {
        let jobLine = '';
        let outcomesLine = '';
        let outcomeDetails = '';
        let connectionSection = '';
        if (task.jobId) {
          const job = await jobService.getJobById(task.jobId, userId);
          if (job) {
            jobLine = `Job: ${job.title}`;
            const piMappings = await mappingService.getMappingsByJobId(job._id || job.id);
            const qboIdSet = new Set();
            const qboDetails: any[] = [];
            for (const piMapping of piMappings) {
              const piQboMappings = await piQboMappingService.getMappingsForPI(piMapping.piId, userId);
              for (const piQbo of piQboMappings) {
                if (!qboIdSet.has(piQbo.qboId)) {
                  qboIdSet.add(piQbo.qboId);
                  const qbo = await qboService.getQBOById(piQbo.qboId, userId);
                  if (qbo) {
                    qboDetails.push(qbo);
                  }
                }
              }
            }
            if (qboDetails.length > 0) {
              const outcomeNames = qboDetails.map((qbo) => qbo.name).join(", ");
              outcomesLine = `Outcome(s): ${outcomeNames}`;
              outcomeDetails = qboDetails.map((qbo) => {
                let detail = `- Outcome: ${qbo.name} (Target: ${qbo.targetValue}, Current: ${qbo.currentValue}, Notes: ${qbo.notes || "None"})`;
                return detail;
              }).join("\n");
              connectionSection = `Task: ${task.title}\n- Job: ${job.title}\n- Outcome(s): ${outcomeNames}\n${outcomeDetails}\n\nIn your answer, after addressing the user's question, you must write a short paragraph (not bullet points) that explicitly mentions the job name and the outcome name(s) as listed above. For example: \"This task is a part of the job **${job.title}** which directly affects the outcome${qboDetails.length > 1 ? 's' : ''} **${outcomeNames}**. Completing this task will... <impact>\".`;
            } else {
              outcomesLine = `Outcome(s): None mapped to this job.`;
              connectionSection = `Task: ${task.title}\n- Job: ${job.title}\n- Outcome(s): None mapped to this job.\n\nIn your answer, address the user's question first, then clearly explain the connection between the task, job, and outcome(s) as described above. When you explain the connection, you must explicitly mention the outcome(s) by name as listed above.`;
            }
          } else {
            jobLine = `Job: (not found)`;
            outcomesLine = `Outcome(s): (unknown)`;
            connectionSection = `Task: ${task.title}\n- Job: (not found)\n- Outcome(s): (unknown)\n\nIn your answer, address the user's question first, then clearly explain the connection between the task, job, and outcome(s) as described above. When you explain the connection, you must explicitly mention the outcome(s) by name as listed above.`;
          }
        } else {
          jobLine = `Job: (none assigned)`;
          outcomesLine = `Outcome(s): (unknown)`;
          connectionSection = `Task: ${task.title}\n- Job: (none assigned)\n- Outcome(s): (unknown)\n\nIn your answer, address the user's question first, then clearly explain the connection between the task, job, and outcome(s) as described above. When you explain the connection, you must explicitly mention the outcome(s) by name as listed above.`;
        }
        systemPrompt += connectionSection;
      }
    } catch (error) {
      console.error("Error enriching context for task:", error);
      systemPrompt += `Task: (unknown)\n- Job: (unknown)\n- Outcome(s): (unknown)\n\nIn your answer, address the user's question first, then clearly explain the connection between the task, job, and outcome(s) as described above. When you explain the connection, you must explicitly mention the outcome(s) by name as listed above.`;
    }
  }

  // If invoked from a job, enrich with job and outcomes context
  if (source === "job" && jobId) {
    try {
      const jobService = new (require("@/lib/services/job.service").JobService)();
      const mappingService = new (require("@/lib/services/pi-job-mapping.service").MappingService)();
      const piQboMappingService = new (require("@/lib/services/pi-qbo-mapping.service").PIQBOMappingService)();
      const qboService = new (require("@/lib/services/qbo.service").QBOService)();
      const job = await jobService.getJobById(jobId, userId);
      if (job) {
        const piMappings = await mappingService.getMappingsByJobId(job._id || job.id);
        const qboIdSet = new Set();
        const qboDetails: any[] = [];
        for (const piMapping of piMappings) {
          const piQboMappings = await piQboMappingService.getMappingsForPI(piMapping.piId, userId);
          for (const piQbo of piQboMappings) {
            if (!qboIdSet.has(piQbo.qboId)) {
              qboIdSet.add(piQbo.qboId);
              const qbo = await qboService.getQBOById(piQbo.qboId, userId);
              if (qbo) {
                qboDetails.push(qbo);
              }
            }
          }
        }
        let connectionSection = '';
        if (qboDetails.length > 0) {
          const outcomeNames = qboDetails.map((qbo) => qbo.name).join(", ");
          const outcomeDetails = qboDetails.map((qbo) => {
            let detail = `- Outcome: ${qbo.name} (Target: ${qbo.targetValue}, Current: ${qbo.currentValue}, Notes: ${qbo.notes || "None"})`;
            return detail;
          }).join("\n");
          connectionSection = `Job: ${job.title}\n- Outcome(s): ${outcomeNames}\n${outcomeDetails}\n\nIn your answer, after addressing the user's question, you must write a short paragraph (not bullet points) that explicitly mentions the outcome name(s) in bold as listed above. For example: \"This job, **${job.title}**, directly impacts the outcome${qboDetails.length > 1 ? 's' : ''} **${outcomeNames}**. By focusing on this job... <impact>\".`;
        } else {
          connectionSection = `Job: ${job.title}\n- Outcome(s): None mapped to this job.\n\nIn your answer, after addressing the user's question, you must write a short paragraph (not bullet points) that explicitly mentions the outcome name(s) as listed above.`;
        }
        systemPrompt += connectionSection;
      }
    } catch (error) {
      console.error("Error enriching context for job:", error);
      systemPrompt += `Job: (unknown)\n- Outcome(s): (unknown)\n\nIn your answer, address the user's question first, then clearly explain the connection between the job and outcome(s) as described above. When you explain the connection, you must explicitly mention the outcome(s) by name as listed above.`;
    }
  }

  // If invoked from the sidepanel, enrich with outcome impact instruction and all QBO names
  if (source === "sidepanel") {
    try {
      const qboService = new (require("@/lib/services/qbo.service").QBOService)();
      const jobService = new (require("@/lib/services/job.service").JobService)();
      const allQBOs = await qboService.getAllQBOs(userId);
      const allJobs = await jobService.getAllJobs(userId);
      let connectionSection = '';
      const outcomeNames = allQBOs && allQBOs.length > 0 ? allQBOs.map((qbo: any) => qbo.name).join(", ") : "(none found)";
      const jobNames = allJobs && allJobs.length > 0 ? allJobs.map((job: any) => job.title).join(", ") : "(none found)";
      connectionSection = `Job(s): ${jobNames}\n- Outcome(s): ${outcomeNames}\n\nIn your answer, after addressing the user's question, you must write a short paragraph (not bullet points) that explicitly mentions the names of any jobs and outcome(s) from the lists above that are relevant to your answer, using their names in bold. Clearly explain the connection and impact on those jobs and outcomes.`;
      systemPrompt += connectionSection;
    } catch (error) {
      console.error("Error enriching context for org outcomes:", error);
      systemPrompt += `Job(s): (unknown)\n- Outcome(s): (unknown)\n\nIn your answer, after addressing the user's question, you must write a short paragraph (not bullet points) that explicitly mentions the names of any jobs and outcome(s) from the lists above that are relevant to your answer, using their names in bold. Clearly explain the connection and impact on those jobs and outcomes.`;
    }
  }
  try {
    const chatService = new ChatService();

    // Call the language model
    const result = streamText({
      model: openai("gpt-4-turbo"),
      system: systemPrompt,
      messages,
      async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
        // Store chat history
        const allMessages = [...messages, { role: "assistant", content: text }];
        await chatService.saveChatHistory(userId!, chatId, allMessages);
      },
    });

    // Respond with the stream
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}