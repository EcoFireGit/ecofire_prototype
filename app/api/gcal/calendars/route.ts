import { NextResponse } from 'next/server';
import { getCalendarsFromGoogle, saveAuthorizedCalendars } from '@/lib/services/gcal.service';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const calendars = await getCalendarsFromGoogle(userId);
    console.log('fetched calendars:', calendars);

    return NextResponse.json({
      success: true,
      data: calendars
    }, { status: 200 });  } 
    catch (error) {
      
      return NextResponse.json(
        
        { error: 'Failed to fetch calendars' },
        { status: 500 }
      );
    }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }
    const authCalendars = await request.json();
    const calendars = await saveAuthorizedCalendars(userId, authCalendars.data);

    return NextResponse.json({
      success: true,
      data: calendars
    }, { status: 200 });
  } catch (error) {
    console.log('error:', error);
    return NextResponse.json(
      { error: 'Failed to save calendars' },
      { status: 500 }
    );
  }
}