import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const taskService = new TaskService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    const { id } = await params;
    const { myDay, myDayDate, completed } = await request.json();
    if (typeof myDay !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'myDay must be a boolean' },
        { status: 400 }
      );
    }
    let updatedTask;
    if (completed === true) {
      updatedTask = await taskService.markCompleted(id, userId!, true);
      if (updatedTask) {
        await taskService.updateTask(id, userId!, { myDay, myDayDate });
        updatedTask.myDay = myDay;
        updatedTask.myDayDate = myDayDate;
      }
    } else {
      const update: any = { myDay };
      if (typeof myDayDate === 'string' || myDayDate === null) {
        update.myDayDate = myDayDate;
      }
      updatedTask = await taskService.updateTask(id, userId!, update);
    }
    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error in PATCH /api/tasks/[id]/myday:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 