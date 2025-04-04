import { NextResponse } from 'next/server';
import { ChatService } from '@/lib/services/chat.service';
import { validateAuth } from '@/lib/utils/auth-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    // Use the Stack Overflow solution to correctly await the chatId
    const chatId = (await params).chatId;
   
    const chatService = new ChatService();
    const chatHistory = await chatService.getChatById(userId!, chatId);
   
    if (!chatHistory) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }
   
    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error('Error in GET /api/chat-history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}