import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import createEvent, {updateEvent, deleteEvent, getAllEventsForTwoWeeks} from '@/lib/services/gcal.events.service';

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
    const eventData = await request.json();
    if (!eventData || !eventData.summary || !eventData.start || !eventData.end) {
      return NextResponse.json(
        { error: 'Missing required event data.' },
        { status: 400 }
      );
    }    
    const savedPrioriCalendarEvent= await createEvent (userId, eventData);

    return NextResponse.json({
      success: true,
      data: savedPrioriCalendarEvent
    }, { status: 200 });
  } catch (error) {
    console.log('error:', error);
    return NextResponse.json(
      { error: 'Failed to create event in Prioriwise calendar' },
      { status: 500 }
    );
  }
}


export async function GET(request: Request) {
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
    const getPrioriCalendarEvents= await getAllEventsForTwoWeeks(userId);

    return NextResponse.json({
      success: true,
      data: getPrioriCalendarEvents
    }, { status: 200 });
  } catch (error) {
    console.log('error:', error);
    return NextResponse.json(
      { error: 'Failed to create event in Prioriwise calendar' },
      { status: 500 }
    );
  }
}

