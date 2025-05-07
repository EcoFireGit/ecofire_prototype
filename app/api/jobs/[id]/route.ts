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

    // Store the initial update result
    let updatedJob = await jobService.updateJob(id, userId!, updateData);
    
    // Check if the job wasn't found
    if (!updatedJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found'
        },
        { status: 404 }
      );
    }
  
    // Set first task as next task if needed
    if(updateData && !('nextTaskId' in updateData)) { 
      const jobWithNextTask = await jobService.setFirstTaskAsNextTaskId(id);
      if (jobWithNextTask) {
        updatedJob = jobWithNextTask;
      }
    }

    // Update tasks status if requested
    const forceUpdateTasks = request.nextUrl.searchParams.get('updateTasks') === 'true';
    if(forceUpdateTasks && updatedJob) {
      await updateTasksStatus(updateData, updatedJob, userId!);
    }
  
    // Return the final updated job
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

  const taskService = new TaskService();
  if (updatedJob.tasks && updatedJob.tasks.length > 0) {
    updatedJob.tasks.forEach(async (taskId:string) => {
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