import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { ChatService } from "@/lib/services/chat.service";
import { MissionService } from "@/lib/services/mission.service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    //console.log("inside onboarding route");
    const params = await req.json();
    const {
      businessName,
      businessIndustry,
      businessDescription,
      monthsInBusiness,
      annualRevenue,
      growthStage,
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

    // console.log("Processing onboarding request for:", businessName);
    // console.log("Industry:", businessIndustry);
    // console.log("Description:", businessDescription.substring(0, 100) + "...");

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
        ? `, with annual revenues of USD ${monthsInBusiness}, `
        : ", ") +
      "and is currently in the " +
      growthStage +
      " stage of growth." +
      'The business mission statement as follows: "' +
      businessDescription +
      '". Provide them with initial strategic recommendations and next steps to establish or grow their business. ' +
      "Be specific, actionable, and empathetic in your response.";

    //const outcomePrompt =
    //"Please suggest the 3 most important outcome metrics for the next 3 months that I can use to track my progress towards accomplishing my mission and distribute 100 points among these outcome metrics as per their importance towards my mission. Output your result in the form of a table with the following columns: Outcome name, target value, deadline (date) and points allocated to that outcome.";
    const outcomePrompt =
      "Please suggest the 3 most important outcome metrics for the next 3 months that I can use to track my progress towards accomplishing my mission and distribute 100 points among these outcome metrics as per their importance towards my mission. Output your result in the form of a JSON in the following format: { 'outcome1': { 'name': 'Outcome 1', 'targetValue': 100, 'deadline':  '2023-12-31', 'points': 50 } }. Your output should strictly follow this format and this should be the only output.";

    const chatService = new ChatService();

    // Set a timeout for the OpenAI API call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("OpenAI API request timed out")),
        25000,
      );
    });

    // Call the language model with timeout
    const missionService = new MissionService();

    // Update the mission with the business description
    try {
      await missionService.updateMission(businessDescription);
      console.log("Mission updated with business description");
    } catch (missionError) {
      console.error("Error updating mission:", missionError);
      // Continue even if mission update fails
    }

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

            // Parse the JSON from the AI response and save to QBO table
            try {
              // Extract JSON from the response text
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                // Assuming jsonStr is the input you're trying to parse
                try {
                  const outcomeData2 = JSON.parse(jsonStr);
                  // Proceed with your logic here using outcomeData
                } catch (error) {
                  console.error(
                    "Error parsing JSON:",
                    error,
                    "Input string:",
                    jsonStr,
                  );
                  // Handle the error accordingly
                }
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
              } else {
                console.error("No JSON format found in AI response");
              }
            } catch (parseError) {
              console.error("Error parsing or saving QBO data:", parseError);
              // Continue even if QBO saving fails
            }
          } catch (saveError) {
            console.error("Error saving chat history:", saveError);
            // We'll continue even if saving fails
          }
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
    // Respond with the stream
    return result.toDataStreamResponse();
  } catch (error: Error) {
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
