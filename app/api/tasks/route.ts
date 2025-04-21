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

export async function PUT(request: Request) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    // Get the request body - jobId and taskIds in their new order
    const { jobId, taskIds } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job ID is required'
        },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(taskIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'taskIds must be an array'
        },
        { status: 400 }
      );
    }
    
    // Update the task order
    const success = await taskService.updateTasksOrder(jobId, userId!, taskIds);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Task order updated successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update task order'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in PUT /api/tasks/order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}