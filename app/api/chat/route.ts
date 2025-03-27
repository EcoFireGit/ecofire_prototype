import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { JobService } from "@/lib/services/job.service";
import { auth } from "@clerk/nextjs/server";
import { ChatService } from "@/lib/services/chat.service";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the data from the body of the request
  const { messages, id } = await req.json();
  const chatId = id || crypto.randomUUID(); // Use provided ID or generate a new one

  // Get mission statement from database
  const { MissionService } = await import("@/lib/services/mission.service");
  const missionService = new MissionService();
  const mission = await missionService.getMission();
  const missionStatement = mission?.statement || "";

  const systemPrompt_initial =
    'You are an elite business strategy consultant with decades of experience across multiple industries, specializing in guiding startups and small businesses from ideation through scaling. You are advising an entrepreneur whose business mission statement is "' +
    missionStatement +
    '" based on cross-industry best practices. This entrepreneur has a list of jobs to be done as follows:\n';
  const jobService = new JobService();
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const allJobs = await jobService.getAllJobs(userId);
  const undoneJobs = allJobs
    .filter((job) => !job.isDone)
    .map((job) => job.title)
    .map((item) => `* ${item}`)
    .join("\n");
  //console.log("chat id", id);
  const systemPrompt = systemPrompt_initial + undoneJobs;
  // console.log("systemPrompt", systemPrompt);
  try {
    const chatService = new ChatService();

    // Call the language model
    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages,
      async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
        // Store chat history
        const allMessages = [...messages, { role: "assistant", content: text }];
        await chatService.saveChatHistory(userId, chatId, allMessages);
      },
    });

    // Respond with the stream
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
