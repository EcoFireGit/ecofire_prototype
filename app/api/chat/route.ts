import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import OpenAI from "openai";
import { JobService } from "@/lib/services/job.service";
import { ChatService } from "@/lib/services/chat.service";
import { BusinessInfoService } from "@/lib/services/business-info.service";
import { validateAuth } from "@/lib/utils/auth-utils";

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
    const jobs = body.generateSuggestionsForJobs;
    // Accept context (e.g. latest messages) to tailor suggestions if a convo is open
    const convoContext: string[] = Array.isArray(body.conversationContext)
      ? body.conversationContext
      : [];

    try {
      const suggestions = await Promise.all(
        jobs.map(async (job: { title: string; tasks?: string[] }) => {
          // Compose a more contextual prompt if there's conversation context
          let contextPrompt = "";
          if (convoContext.length > 0) {
            contextPrompt =
              `Here is the recent conversation context for the user about their business and jobs:\n` +
              convoContext.map((msg) => `- ${msg}`).join("\n") +
              "\n";
          }
          const tasksStr = job.tasks && job.tasks.length
            ? `\nThe job "${job.title}" has the following sub-tasks: ${job.tasks.join(", ")}.`
            : "";
          const prompt =
            `${contextPrompt}A job represents a high-level goal and a task is a sub-task under that job.` +
            ` Suggest 3 practical, actionable and distinct questions or things a user might want to ask or do about the job "${job.title}".${tasksStr} Respond with only a JSON array of strings.`;
          const resp = await openaiDirect.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            temperature: 0.7,
          });
          const text = resp.choices[0].message.content || "[]";
          let suggestions: string[] = [];
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

  // --- Normal chat branch ---

  const { messages, id } = body;
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
  const systemPrompt = systemPrompt_initial + undoneJobs;

  try {
    const chatService = new ChatService();

    // Call the language model for streaming chat
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