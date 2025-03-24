
import { auth } from "@clerk/nextjs/server";
import { ChatService } from "@/lib/services/chat.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Get pagination parameters from URL
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '3', 10);
    const skip = parseInt(url.searchParams.get('skip') || '0', 10);
    
    const chatService = new ChatService();
    const recentChats = await chatService.getRecentChats(userId, limit, skip);
    const totalChats = await chatService.getTotalChatCount(userId);
    
    return NextResponse.json({
      chats: recentChats,
      total: totalChats,
      hasMore: skip + recentChats.length < totalChats
    });
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
