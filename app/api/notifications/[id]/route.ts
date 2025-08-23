import { NextResponse } from 'next/server';
import { getCalendarsFromGoogle, saveAuthorizedCalendars } from '@/lib/services/gcal.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { NotificationService } from '@/lib/services/notification.service';

const notificationService = new NotificationService();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.actualUserId;
    const { id } = await params;

    // Enhanced validation
    const updatedNotification = await notificationService.markNotificationAsRead(id, userId!);
    
    return NextResponse.json(
      { success: true, data: updatedNotification },
      { status: 200 }
    );

  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.actualUserId;
    const { id } = await params;

    const deleted = await notificationService.deleteNotification(id, userId!);
    
    return NextResponse.json(
      { success: true, data: deleted },
      { status: 200 }
    );

  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
