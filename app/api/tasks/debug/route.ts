import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const taskService = new TaskService();

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    // Call the debug method
    await taskService.debugTaskState();
    
    return NextResponse.json({ success: true, message: 'Debug info logged to console' });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
