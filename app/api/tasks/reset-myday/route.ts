import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const taskService = new TaskService();

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    const result = await taskService.resetMyDayForUser(userId!);
    return NextResponse.json({ success: true, updatedCount: result });
  } catch (error) {
    console.error('Error in POST /api/tasks/reset-myday:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 