// app/api/recurring-tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';
import { TaskService } from '@/lib/services/task.service';

const taskService = new TaskService();

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.actualUserId;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'list') {
      // Get all recurring tasks for the user
      const recurringTasks = await taskService.getRecurringTasks(userId!);
      
      return NextResponse.json({
        success: true,
        data: recurringTasks,
        count: recurringTasks.length
      });
    }

    if (action === 'instances') {
      // Get instances of a specific recurring task
      const parentTaskId = url.searchParams.get('parentTaskId');
      if (!parentTaskId) {
        return NextResponse.json(
          { success: false, error: 'Parent task ID is required' },
          { status: 400 }
        );
      }

      const instances = await taskService.getRecurringTaskInstances(parentTaskId, userId!);
      
      return NextResponse.json({
        success: true,
        data: instances,
        count: instances.length,
        parentTaskId
      });
    }

    if (action === 'stats') {
      // Get recurring task statistics
      const recurringTasks = await taskService.getRecurringTasks(userId!);
      
      // Calculate stats
      const totalRecurring = recurringTasks.length;
      const activeRecurring = recurringTasks.filter(task => 
        task.isRecurring && !task.isDeleted
      ).length;
      
      const byPattern = recurringTasks.reduce((acc, task) => {
        const pattern = task.recurrencePattern || 'none';
        acc[pattern] = (acc[pattern] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const upcomingCount = recurringTasks.filter(task => 
        task.nextRecurringDate && new Date(task.nextRecurringDate) > new Date()
      ).length;

      return NextResponse.json({
        success: true,
        data: {
          totalRecurring,
          activeRecurring,
          upcomingCount,
          patternBreakdown: byPattern
        }
      });
    }

    // Default: return all recurring tasks
    const recurringTasks = await taskService.getRecurringTasks(userId!);
    
    return NextResponse.json({
      success: true,
      data: recurringTasks,
      count: recurringTasks.length
    });

  } catch (error) {
    console.error('Error in GET /api/recurring-tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}