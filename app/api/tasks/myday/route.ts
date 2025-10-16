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
    const userId = authResult.userId;
    
    const myDayTasks = await taskService.getMyDayTasks(userId!);
    
    return NextResponse.json({ success: true, data: myDayTasks });
  } catch (error) {
    console.error('Error in GET /api/tasks/myday:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}