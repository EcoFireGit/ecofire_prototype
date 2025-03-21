// app/api/tasks/route.ts

import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { auth } from '@clerk/nextjs/server';

const taskService = new TaskService();

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }


    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job ID is required'
        },
        { status: 400 }
      );
    }

    const tasks = await taskService.getTasksByJobId(jobId, userId);
   
    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }
    
    const taskData = await request.json();
    
    if (!taskData.jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job ID is required'
        },
        { status: 400 }
      );
    }
    
    const task = await taskService.createTask(taskData, userId);
    
    return NextResponse.json({
      success: true,
      data: task
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}