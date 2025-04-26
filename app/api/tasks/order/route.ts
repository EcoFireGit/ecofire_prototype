import { validateAuth } from "@/lib/utils/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/lib/services/task.service";

const taskService = new TaskService();

export async function PUT(request: NextRequest) {
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