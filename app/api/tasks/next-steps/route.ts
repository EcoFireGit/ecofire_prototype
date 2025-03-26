// app/api/tasks/next-steps/route.ts
import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { auth } from '@clerk/nextjs/server';

const taskService = new TaskService();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Add a new method to your TaskService to get all next tasks
    const tasks = await taskService.getNextTasks(userId);
   
    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error in GET /api/tasks/next-steps:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}