import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const taskService = new TaskService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    const { id: sourceTaskId } = await params;
    const { newTaskData } = await request.json();
    if (!sourceTaskId) {
      return NextResponse.json({ success: false, error: 'Source task ID is required' }, { status: 400 });
    }
    // Fetch the source task
    const sourceTask = await taskService.getTaskById(sourceTaskId, userId!);
    if (!sourceTask) {
      return NextResponse.json({ success: false, error: 'Source task not found' }, { status: 404 });
    }
    // Prepare the duplicated task data
    const duplicatedTaskData = {
      ...sourceTask,
      ...newTaskData,
      completed: false,
    };
    // Remove unique fields
    delete duplicatedTaskData._id;
    delete duplicatedTaskData.id;
    // Create the new task
    const newTask = await taskService.createTask(duplicatedTaskData, userId!);
    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks/[id]/duplicate:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
} 