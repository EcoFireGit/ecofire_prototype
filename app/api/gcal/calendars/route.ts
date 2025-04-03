import { NextResponse } from 'next/server';
import { getCalendarsFromGoogle, saveAuthorizedCalendars } from '@/lib/services/gcal.service';
import { validateAuth } from '@/lib/utils/auth-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id?: string }> } // Pattern for future param usage
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    // Example of proper param handling for future endpoints
    // const {id} = await params; 
    
    const calendars = await getCalendarsFromGoogle(userId!);

    return NextResponse.json({
      success: true,
      data: calendars
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching calendars:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const { calendars } = await request.json();

    // Enhanced validation
    if (!Array.isArray(calendars) || calendars.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payload must contain a non-empty array of calendars' },
        { status: 400 }
      );
    }

    const schemaValid = calendars.every(cal => 
      cal?.id && cal?.etag && cal?.summary && cal?.timeZone
    );

    if (!schemaValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid calendar schema' },
        { status: 400 }
      );
    }

    const savedCalendars = await saveAuthorizedCalendars(userId!, calendars);
    
    return NextResponse.json(
      { success: true, data: savedCalendars },
      { status: 200 }
    );

  } catch (error) {
    console.error('Calendar save error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
