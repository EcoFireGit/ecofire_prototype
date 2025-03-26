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
    //console.log("inside onboarding route");
    const data = await req.json();
    
    const { businessName, businessIndustry, businessDescription } = data.data;
    // console.log(businessName, businessIndustry, businessDescription);
    if (!businessName || !businessIndustry || !businessDescription) {
      return new Response(JSON.stringify({ 
        error: "Bad Request", 
        message: "Missing required business information" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    const chatId = crypto.randomUUID(); // Generate a new chat ID for this session

    // console.log("Processing onboarding request for:", businessName);
    // console.log("Industry:", businessIndustry);
    // console.log("Description:", businessDescription.substring(0, 100) + "...");
    
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

    const outcomePrompt =
      "Please suggest the 5 most important outcome metrics for the next 3 months that I can use to track my progress towards accomplishing my mission and distribute 100 points among these outcome metrics as per their importance towards my mission. Output your result in the form of a table with the following columns: Outcome name, target value, deadline (date) and points allocated to that outcome.";

    const chatService = new ChatService();

    // Set a timeout for the OpenAI API call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OpenAI API request timed out")), 25000);
    });

    // Call the language model with timeout
    const result = await Promise.race([
      streamText({
        model: openai("gpt-4o"),
        system: systemPrompt,
        prompt: outcomePrompt,
        async onFinish({ text, usage, finishReason }) {
          // Store chat history
          const messages = [
            { role: "user", content: outcomePrompt },
            { role: "assistant", content: text },
            { role: "system", content: systemPrompt }
          ];
          try {
            await chatService.saveChatHistory(userId, chatId, messages);
            console.log("Chat saved with ID:", chatId);
          } catch (saveError) {
            console.error("Error saving chat history:", saveError);
            // We'll continue even if saving fails
          }
        },
      }),
      timeoutPromise
    ]).catch(error => {
      console.error("API timeout or error:", error.message);
      throw new Error("Request timeout - GPT API is taking too long to respond");
    });

    console.log("Stream response generated, sending back to client");
    // Respond with the stream
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in onboarding API:", error);
    
    // Provide a more specific error status and message for timeouts
    const status = error.message?.includes("timeout") ? 504 : 500;
    const message = error.message?.includes("timeout") 
      ? "Request timed out - please try again" 
      : "Internal Server Error - " + error.message;
    
    return new Response(JSON.stringify({ error: status === 504 ? "Gateway Timeout" : "Internal Server Error", message }), { 
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}