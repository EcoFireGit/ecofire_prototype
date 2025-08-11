// app/api/tasks/route.ts

import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { JobService } from '@/lib/services/job.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const taskService = new TaskService();
const jobService = new JobService();

export async function GET(request: Request) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;


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
    

    const tasks = await taskService.getTasksByJobId(jobId, userId!);
   
    const formattedTasks = tasks.map(task => ({
      ...task,
      isRecurring: task.isRecurring,
      recurrenceInterval: task.recurrenceInterval,
    }));
    return NextResponse.json({
      success: true,
      count: formattedTasks.length,
      data: formattedTasks
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
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
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
    
    const task = await taskService.createTask(taskData, userId!);
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