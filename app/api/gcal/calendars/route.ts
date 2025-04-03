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
// Update the POST handler
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    // Parse and validate request body
    const { calendars } = await request.json();
    
    if (!Array.isArray(calendars) || calendars.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid calendar data' },
        { status: 400 }
      );
    }

    // Validate each calendar object
    for (const calendar of calendars) {
      if (!calendar.id || !calendar.etag || !calendar.summary || !calendar.timeZone) {
        return NextResponse.json(
          { success: false, error: 'Missing required calendar fields' },
          { status: 400 }
        );
      }
    }

    // Save all calendar data
    const savedCalendars = await saveAuthorizedCalendars(userId, calendars);
    
    return NextResponse.json(
      { success: true, data: savedCalendars },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return serverErrorResponse();
  }
}

// Helper functions
const unauthorizedResponse = () => 
  NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

const serverErrorResponse = () =>
  NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
