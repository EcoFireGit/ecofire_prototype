// pages/api/cron/checkConflicts.ts
import { NextRequest, NextResponse } from 'next/server';
import { JobService } from '@/lib/services/job.service'; // Replace with your DB utility
import { EventsService } from '@/lib/services/gcal.events.service';
import { NotificationService } from '@/lib/services/notification.service';

export async function GET(req: NextRequest) {
  try {
    //@Shrikant - IS this correct? Shouldn't it be taks ??
    const jobService = new JobService();
    const users = await jobService.getAllUsersWithAssignedJobs();

    for (const user of users) {
      const upcomingAppts = await getUpcomingApptsFor(user);

      if (upcomingAppts && upcomingAppts.length > 0) {
        console.log(`User ${user} has upcoming appointments:`, upcomingAppts);
        await triggerInAppNotification(user, {
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
  