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

    if (action === 'debug') {
      // Import Task model for direct database access
      const Task = require('@/lib/models/task.model').default;
      await require('@/lib/mongodb').default();
      
      // DEBUG ACTION - Safe read-only operations to troubleshoot recurring tasks
      try {
        // Get all user tasks directly from database
        const allUserTasks = await Task.find({ 
          userId: userId,
          isDeleted: { $ne: true }
        }).lean();
        
        // Filter different types of tasks with proper typing
        const recurringTasks = allUserTasks.filter((task: any) => task.isRecurring === true);
        const childTasks = allUserTasks.filter((task: any) => task.parentRecurringTaskId);
        const testTasks = allUserTasks.filter((task: any) => 
          task.title?.toLowerCase().includes('test daily task')
        );
        
        // Get recent tasks (last 10)
        const recentTasks = allUserTasks
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
        
        return NextResponse.json({
          success: true,
          debug: true,
          data: {
            userId,
            summary: {
              totalTasks: allUserTasks.length,
              recurringTasks: recurringTasks.length,
              childTasks: childTasks.length,
              testTasks: testTasks.length
            },
            recurringTasks: recurringTasks.map((task: any) => ({
              _id: task._id,
              title: task.title,
              isRecurring: task.isRecurring,
              recurrencePattern: task.recurrencePattern,
              nextRecurringDate: task.nextRecurringDate,
              recurrenceCurrentCount: task.recurrenceCurrentCount,
              createdAt: task.createdAt,
              date: task.date
            })),
            testTasks: testTasks.map((task: any) => ({
              _id: task._id,
              title: task.title,
              isRecurring: task.isRecurring,
              recurrencePattern: task.recurrencePattern,
              createdAt: task.createdAt,
              date: task.date
            })),
            recentTasks: recentTasks.map((task: any) => ({
              _id: task._id,
              title: task.title,
              isRecurring: task.isRecurring || false,
              createdAt: task.createdAt,
              date: task.date
            })),
            childTasks: childTasks.map((task: any) => ({
              _id: task._id,
              title: task.title,
              parentRecurringTaskId: task.parentRecurringTaskId,
              createdAt: task.createdAt,
              date: task.date
            }))
          }
        });
      } catch (dbError: any) {
        console.error('Database error in debug action:', dbError);
        return NextResponse.json({
          success: false,
          debug: true,
          error: 'Database error',
          details: dbError.message
        });
      }
    }

    if (action === 'process-debug-detailed') {
      // Import Task model for direct database access
      const Task = require('@/lib/models/task.model').default;
      await require('@/lib/mongodb').default();
      
      try {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        
        // Get all user's recurring tasks
        const recurringTasks = await Task.find({
          userId: userId,
          isRecurring: true,
          isDeleted: { $ne: true }
        }).lean();
        
        console.log('Debug processing criteria:');
        console.log('Current time:', now.toISOString());
        console.log('Tomorrow start:', tomorrow.toISOString());
        
        // Check each task against common processing criteria
        const tasksAnalysis = recurringTasks.map((task: any) => {
          const nextDate = task.nextRecurringDate ? new Date(task.nextRecurringDate) : null;
          
          return {
            title: task.title,
            nextRecurringDate: task.nextRecurringDate,
            nextDateParsed: nextDate?.toISOString(),
            isNextDateBeforeNow: nextDate ? nextDate <= now : false,
            isNextDateBeforeTomorrow: nextDate ? nextDate <= tomorrow : false,
            isNextDateToday: nextDate ? (
              nextDate.toDateString() === now.toDateString()
            ) : false,
            isNextDateTomorrow: nextDate ? (
              nextDate.toDateString() === tomorrow.toDateString()
            ) : false,
            hasNextDate: !!nextDate,
            recurrencePattern: task.recurrencePattern,
            isActive: task.isRecurring && !task.isDeleted
          };
        });
        
        // Count how many match different criteria
        const shouldProcessToday = tasksAnalysis.filter((t: any) => t.isNextDateBeforeNow && t.hasNextDate);
        const shouldProcessTomorrow = tasksAnalysis.filter((t: any) => t.isNextDateBeforeTomorrow && t.hasNextDate);
        const forToday = tasksAnalysis.filter((t: any) => t.isNextDateToday);
        const forTomorrow = tasksAnalysis.filter((t: any) => t.isNextDateTomorrow);
        
        return NextResponse.json({
          success: true,
          debug: true,
          data: {
            currentTime: now.toISOString(),
            tomorrowStart: tomorrow.toISOString(),
            totalRecurringTasks: recurringTasks.length,
            analysis: {
              shouldProcessToday: shouldProcessToday.length,
              shouldProcessTomorrow: shouldProcessTomorrow.length,
              forToday: forToday.length,
              forTomorrow: forTomorrow.length
            },
            tasksAnalysis,
            recommendations: {
              shouldProcessToday: shouldProcessToday.map((t: any) => t.title),
              shouldProcessTomorrow: shouldProcessTomorrow.map((t: any) => t.title),
              forToday: forToday.map((t: any) => t.title),
              forTomorrow: forTomorrow.map((t: any) => t.title)
            }
          }
        });
        
      } catch (error: any) {
        console.error('Debug processing error:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        });
      }
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