import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import OpenAI from "openai";
import { JobService } from "@/lib/services/job.service";
import { ChatService } from "@/lib/services/chat.service";
import { BusinessInfoService } from "@/lib/services/business-info.service";
import { validateAuth } from "@/lib/utils/auth-utils";
import { MappingService } from "@/lib/services/pi-job-mapping.service";
import { PIQBOMappingService } from "@/lib/services/pi-qbo-mapping.service";
import { QBOService } from "@/lib/services/qbo.service";
import { TaskService } from "@/lib/services/task.service"; // added for business function lookup
import { BusinessFunctionService } from "@/lib/services/business-function.service"; // import for business function name lookup

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// You may want to memoize/reuse this if called often
const openaiDirect = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const body = await req.json();

  // --- AI suggestion generator branch ---
  if (body.generateSuggestionsForJobs && Array.isArray(body.generateSuggestionsForJobs)) {
    // Get user ID from auth
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    const jobs = body.generateSuggestionsForJobs;
    // Accept context (e.g. latest messages) to tailor suggestions if a convo is open
    const convoContext = Array.isArray(body.conversationContext)
      ? body.conversationContext
      : [];

    try {
      const jobService = new JobService();
      const taskService = new TaskService();
      const businessFunctionService = new BusinessFunctionService();

      const suggestions = await Promise.all(
        jobs.map(async (job: { tasks: any[]; title: any; id?: any; taskId?: any }) => {
          // Fetch job details for businessFunction
          let businessFunction = "none";
          let jobDetails = null;

          // Find job info either by id or title
          if (job.id) {
            jobDetails = await jobService.getJobById(job.id, userId!);
          } else if (job.title) {
            const allJobs = await jobService.getAllJobs(userId!);
            jobDetails = allJobs.find((j: any) => j.title === job.title);
          }

          // Fetch the business function name if available
          if (jobDetails && jobDetails.businessFunctionId) {
            const allBFs = await businessFunctionService.getAllBusinessFunctions(userId!);
            const bfObj = allBFs.find(bf => bf.id === jobDetails.businessFunctionId || bf._id === jobDetails.businessFunctionId);
            businessFunction = bfObj && bfObj.name ? bfObj.name : "";
          }

          // If this is a task context, use the business function from the linked job (tasks don't have business functions)
          if (job.taskId) {
            const taskDetails = await taskService.getTaskById(job.taskId, userId!);
            if (taskDetails && taskDetails.jobId && !businessFunction) {
              // Get the job for the task and use its business function
              const linkedJob = await jobService.getJobById(taskDetails.jobId, userId!);
              if (linkedJob && linkedJob.businessFunctionId) {
              const allBFs2 = await businessFunctionService.getAllBusinessFunctions(userId!);
                const bfObj2 = allBFs2.find(bf => bf.id === linkedJob.businessFunctionId || bf._id === linkedJob.businessFunctionId);
                businessFunction = bfObj2 && bfObj2.name ? bfObj2.name : "";
              }
            }
          }

          // Compose a more contextual prompt if there's conversation context
          let contextPrompt = "";
          if (convoContext.length > 0) {
            contextPrompt =
              `Here is the recent conversation context for the user about their business and jobs:\n` +
              convoContext.map((msg: any) => `- ${msg}`).join("\n") +
              "\n";
          }

          // Add business function to the context
          let businessFunctionPrompt = "";
          if (businessFunction) {
            businessFunctionPrompt = `\nThis job is associated with the business function: "${businessFunction}".`;
          }

          const tasksStr = job.tasks && job.tasks.length
            ? `\nThe job "${job.title}" has the following sub-tasks: ${job.tasks.join(", ")}.`
            : "";

          // Tailored prompt for suggestions, now includes business function and instructs the AI to match suggestions to the job/task
          const prompt =
            `${contextPrompt}A job represents a high-level goal and a task is a sub-task under that job.` +
            `${businessFunctionPrompt}` +
            ` Suggest 3 practical, actionable and distinct questions or things a user might want to ask or do about the job "${job.title}".` +
            `${tasksStr}` +
            ` Make sure your suggestions are relevant to the business function and the specific nature of the job/task. Respond with only a JSON array of strings.`;

          const resp = await openaiDirect.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            temperature: 0.7,
          });
          const text = resp.choices[0].message.content || "[]";
          let suggestions = [];
          try {
            suggestions = JSON.parse(text);
          } catch {
            // fallback: split by line if not valid JSON
            suggestions = text
              .split("\n")
              .map(s => s.replace(/^- /, "").replace(/^["']|["']$/g, "").trim())
              .filter(Boolean);
          }
          return { title: job.title, suggestions };
        })
      );
      return Response.json({ suggestions });
    } catch (e) {
      return Response.json({ suggestions: [] }, { status: 200 });
    }
  }

  // --- Task extraction branch ---
  if (body.extractTaskCandidates) {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    const { assistantResponse, context } = body;

    try {
      // Get existing jobs to ensure we only suggest tasks for existing jobs
      const jobService = new JobService();
      const existingJobs = await jobService.getAllJobs(userId!);
      const jobTitles = existingJobs.map(job => job.title).join(", ");
      
      // Use OpenAI to extract task candidates from the assistant response
      const prompt = `You are a task extraction expert. Analyze the following AI assistant response and extract 2-3 specific, actionable tasks that a business user might want to add to their task list.

Assistant response: "${assistantResponse}"

Context: ${JSON.stringify(context)}

EXISTING JOBS (you MUST only suggest tasks for these existing jobs): ${jobTitles}

Look for:
- Specific actions mentioned (research, create, contact, review, etc.)
- Next steps suggested
- Recommendations that require action
- Follow-up items
- Things that need to be done or completed

Return ONLY a valid JSON array (no markdown, no explanation) with this exact format:
[
  {
    "title": "Brief, actionable task title starting with a verb",
    "description": "Brief explanation of what needs to be done",
    "suggestedJobTitle": "MUST be exactly one of these existing job titles: ${jobTitles}"
  }
]

CRITICAL: The suggestedJobTitle MUST be exactly one of the existing job titles listed above. Do not create new job names.
If no specific actionable tasks can be extracted that relate to existing jobs, return: []`;

      const resp = await openaiDirect.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      });

      const text = resp.choices[0].message.content || "[]";
      console.log("Raw OpenAI response for task extraction:", text);
      
      let candidates = [];
      try {
        candidates = JSON.parse(text);
        console.log("Parsed candidates:", candidates);
      } catch (parseError) {
        console.log("JSON parse failed, trying to extract from text:", parseError);
        // Fallback: try to extract tasks from non-JSON response
        const lines = text.split('\n').filter(line => line.trim());
        candidates = lines
          .filter(line => 
            line.includes('-') || 
            line.toLowerCase().includes('task') || 
            line.toLowerCase().includes('step') ||
            line.toLowerCase().includes('action')
          )
          .slice(0, 3) // limit to 3 tasks
          .map((line, idx) => ({
            title: line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim(),
            description: "",
            suggestedJobTitle: context?.jobTitle || ""
          }))
          .filter(task => task.title.length > 5); // filter out very short titles
      }

      const finalCandidates = Array.isArray(candidates) ? candidates : [];
      console.log("Final candidates being returned:", finalCandidates);
      
      return Response.json({ candidates: finalCandidates });
    } catch (e) {
      console.error("Error extracting task candidates:", e);
      return Response.json({ candidates: [] });
    }
  }

  // --- Task creation branch ---
  if (body.createTaskFromSuggestion) {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    const { task, context } = body;

    try {
      const taskService = new TaskService();
      const jobService = new JobService();
      
      let targetJobId = task.jobId;
      
      // If no specific jobId provided, try to find/create job based on suggestion
      if (!targetJobId && task.suggestedJobTitle) {
        const allJobs = await jobService.getAllJobs(userId!);
        let matchingJob = allJobs.find(j => 
          j.title.toLowerCase().includes(task.suggestedJobTitle.toLowerCase()) ||
          task.suggestedJobTitle.toLowerCase().includes(j.title.toLowerCase())
        );
        
        if (!matchingJob) {
          // If multiple jobs found or no exact match, return job options for user to choose
          const similarJobs = allJobs.filter(j => 
            j.title.toLowerCase().includes(task.suggestedJobTitle.toLowerCase()) ||
            task.suggestedJobTitle.toLowerCase().includes(j.title.toLowerCase())
          );
          
          if (similarJobs.length === 0 && allJobs.length > 0) {
            // No similar jobs, let user pick from all jobs
            return Response.json({ 
              needsSelection: true, 
              jobs: allJobs.map(j => ({ id: j.id || j._id, title: j.title }))
            });
          } else if (similarJobs.length > 1) {
            // Multiple similar jobs, let user choose
            return Response.json({ 
              needsSelection: true, 
              jobs: similarJobs.map(j => ({ id: j.id || j._id, title: j.title }))
            });
          }
        }
        
        if (matchingJob) {
          targetJobId = matchingJob.id || matchingJob._id;
        }
      }
      
      // If still no job found, return job selection options
      if (!targetJobId) {
        const allJobs = await jobService.getAllJobs(userId!);
        return Response.json({ 
          needsSelection: true, 
          jobs: allJobs.map(j => ({ id: j.id || j._id, title: j.title }))
        });
      }
      
      // Create the task
      const newTask = await taskService.createTask({
        title: task.title,
        notes: task.description || "",
        jobId: targetJobId
      }, userId!);
      
      return Response.json({ 
        createdTask: {
          id: newTask.id || newTask._id,
          title: newTask.title,
          jobId: targetJobId
        }
      });
      
    } catch (e) {
      console.error("Error creating task:", e);
      return Response.json({ error: "Failed to create task" }, { status: 500 });
    }
  }

  // --- Normal chat branch ---

  // Extract other params safely
  const { messages, id, source, jobId, taskId, jobTitle } = body;
  const chatId = id || crypto.randomUUID();

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
          const job = await jobService.getJobById(task.jobId, userId!);
          if (job) {
            jobLine = `Job: ${job.title}`;
            const piMappings = await mappingService.getMappingsByJobId(job._id || job.id);
            const qboIdSet = new Set();
            const qboDetails = [];
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
if (!messages || !Array.isArray(messages) || messages.length ===
   0) {
    console.log("Fail");
    return new Response("Bad Request: messages must be defined and non-empty", { status: 400 });
  }
    // Call the language model for streaming chat
    const result = streamText({
      model: openai("gpt-4-turbo"),
      system: systemPrompt,
      messages,
      async onFinish({ text }) {
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