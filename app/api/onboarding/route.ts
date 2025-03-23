import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { ChatService } from "@/lib/services/chat.service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = await req.json();
    const { businessName, businessIndustry, businessDescription } = data;
    const chatId = crypto.randomUUID(); // Generate a new chat ID for this session

    const systemPrompt =
      "You are an elite business strategy consultant specializing in guiding startups and small businesses. " +
      'You are consulting a new business owner whose business is named: "' +
      businessName +
      '", which is in the industry of ' +
      businessIndustry +
      ' and is described as follows: "' +
      businessDescription +
      '". Provide them with initial strategic recommendations and next steps to establish or grow their business. ' +
      "Be specific, actionable, and empathetic in your response.";

    console.log("Processing onboarding request for:", businessName);
    console.log("Business description:", businessDescription);

    const outcomePrompt =
      "Please suggest the 5 most important outcome metrics for the next 3 months that I can use to track my progress towards accomplishing my mission and distribute 100 points among these outcome metrics as per their importance towards my mission. Output your result in the form of a table with the following columns: Outcome name, target value, deadline (date) and points allocated to that outcome.";

    const chatService = new ChatService();

    // Call the language model
    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      prompt: outcomePrompt,
      async onFinish({ text, usage, finishReason }) {
        // Store chat history
        const messages = [
          { role: "user", content: outcomePrompt },
          { role: "assistant", content: text },
        ];
        await chatService.saveChatHistory(userId, chatId, messages);
        console.log("Chat saved with ID:", chatId);
      },
    });

    // Respond with the stream
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in onboarding API:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
