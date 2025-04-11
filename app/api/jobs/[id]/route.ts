// route: /api/jobs/:id
// description: Get job by id
import { NextRequest, NextResponse } from 'next/server';
import { JobService } from '@/lib/services/job.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { TaskProgressService } from '@/lib/services/task-progress.service';
import { TaskService } from '@/lib/services/task.service';
import { Task } from '@/components/tasks/types';
import { Jobs } from '@/lib/models/job.model';

const jobService = new JobService();

export async function GET(
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
    const job = await jobService.getJobById(id, userId!);
 
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found'
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error in GET /api/jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const updateData = await request.json();
    console.log('Updated Data:', updateData);

    const updatedJob = await jobService.updateJob(id, userId!, updateData);
    
    if (!updatedJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found'
        },
        { status: 404 }
      );
    } 
    
    
    console.log('Updated job:', updatedJob);
    const forceUpdateTasks = request.nextUrl.searchParams.get('updateTasks') === 'true';

    if(forceUpdateTasks) {
      await updateTasksStatus(updateData, updatedJob, userId!);
    }

    return NextResponse.json({
      success: true,
      data: updatedJob
    });
  } catch (error) {
    console.error('Error in PUT /api/jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

async function updateTasksStatus(updateData: any,updatedJob: Jobs, userId: string) {

  console.log('Job completed:', updatedJob);
  const taskService = new TaskService();
  if (updatedJob.tasks && updatedJob.tasks.length > 0) {
    updatedJob.tasks.forEach(async (taskId:string) => {
      console.log('Updating tasks', taskId, updatedJob.isDone);

      await taskService.markCompleted(taskId, userId!, updatedJob.isDone);
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const forceDelete = request.nextUrl.searchParams.get('deleteTasks') === 'true';

    const { id } = await params;
    const deleted = await jobService.deleteJob(id, userId!);
    
    console.log('deleted job:', deleted);
    if(forceDelete) {
      const taskService = new TaskService();
      await taskService.deleteTasksByJobId(id, userId!);
    }

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found'
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}