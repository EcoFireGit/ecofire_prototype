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
    
    //does job have any next task ? set the new task as next task , if none is set up already
    const job =  await jobService.getJobById(taskData.jobId, userId);
    if(job?.nextTaskId != null) {
      job.nextTaskId=task.id;
      const updatedJob = await jobService.updateJob(taskData.jonId, userId, job);
      console.log("updated Job with Task Id", updatedJob?.nextTaskId);
    }

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