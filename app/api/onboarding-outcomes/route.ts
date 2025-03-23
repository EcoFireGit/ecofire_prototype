
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { ChatService } from "@/lib/services/chat.service";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the data from the body of the request
  const { messages, businessDescription } = await req.json();
  const chatId = crypto.randomUUID(); // Generate a new chat ID for this session
  
  const systemPrompt = 
    'You are an elite business strategy consultant specializing in guiding startups and small businesses. ' +
    'A new business owner has just described their business as follows: "' + 
    businessDescription + 
    '". Provide them with initial strategic recommendations and next steps to establish or grow their business. ' +
    'Be specific, actionable, and empathetic in your response.';

  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chatService = new ChatService();

    // Call the language model
    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages,
      async onFinish({ text, usage, finishReason }) {
        // Store chat history with a special tag for onboarding
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
