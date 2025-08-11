import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { JobService } from '@/lib/services/job.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const taskService = new TaskService();
const jobService = new JobService();


export async function PUT( request: NextRequest,
  { params }: { params: Promise<{ id: string, taskid: string }> }){
   
  const { id, taskid } = await params; 
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const updateData = await request.json();
    
    let updatedTask;
    if ('completed' in updateData) {
      updatedTask = await taskService.markCompleted(taskid, userId!, updateData.completed);
    } else {
      updatedTask = await taskService.updateTask(taskid, userId!, updateData);
    }

    if(updateData.completed === true){
      const updtedJob = await jobService.setIncompleteTaskAsNextStep(id, taskid);
    }

    if (!updatedTask) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found'
        },
        { status: 404 }
      );
    }
   
    //after task has been completed 
    return NextResponse.json({
      success: true,
      data: updatedTask
    }, { status: 200
    });
  } catch (error) {
    console.error('Error in PUT /api/tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}
