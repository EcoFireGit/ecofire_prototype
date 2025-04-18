// pages/api/cron/checkConflicts.ts
import { NextRequest, NextResponse } from 'next/server';
import { EventsService } from '@/lib/services/gcal.events.service';
import { NotificationService } from '@/lib/services/notification.service';
import { TaskService } from '@/lib/services/task.service';
import { validateAuth } from '@/lib/utils/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const taskService = new TaskService();
    // changing this to get current user instead of all users with assigned tasks
    // const users = await taskService.getAllUsersWithAssignedTasks();
    // Get actual user ID from auth
      const authResult = await validateAuth();
          
          if (!authResult.isAuthorized) {
            return authResult.response;
          }
          
          const userId = authResult.actualUserId;
          const users = [userId]; // Wrap in an array to maintain the same structure as before
          
    for (const user of users) {
      const upcomingAppts = await getUpcomingApptsFor(user!);
      console.log(`User ${user} upcoming appointments:`, upcomingAppts.length);
      if (upcomingAppts && upcomingAppts.length > 0) {
        console.log(`User ${user} has upcoming appointments:`, upcomingAppts.length);
        await triggerInAppNotification(user!, {
          type: 'upcoming_event',
          message: 'You have upcoming appointment(s) that may conflict with your tasks.',   
          data: upcomingAppts
        
        });
      }
    }

      return NextResponse.json(
        {
          success: true,
          error: 'Reprioritized tasks notifications done'
        },
        { status: 200 }
      );    
    
  } catch (err) {
    console.error('Reprioritized tasks notifications failed:', err);
    return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error'
        },
        { status: 200 }
      );    
  }
}

 async function triggerInAppNotification(userId: string, notification: {
    type: string,
    message: string,
    data?: any
  }) {
    const notificationService = new NotificationService();
    await notificationService.createNotificationIfDoesntExist(userId, notification.type, notification.message, notification.data);
  }

  async function getUpcomingApptsFor(user: string): Promise<any[]> {
    const eventsService = new EventsService();
    const upcomingEvents = await eventsService.getUpcomingCalendarEventsFor(user);
    return upcomingEvents;
  }
  