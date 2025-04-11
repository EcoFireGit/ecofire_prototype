import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';
import { getAllEventsForTwoWeeks } from '@/lib/services/google.calendar.provider';
import { getCalendarEvents } from "@/lib/services/gcal.events.service";


export async function GET(request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const { id } = await params;  // Awaiting params to get id
    
    const getPrioriCalendarEvents= await getCalendarEvents(userId, id);

    return NextResponse.json({
      success: true,
      data: getPrioriCalendarEvents
    }, { status: 200 });
  } catch (error) {
    console.log('error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve eventss' },
      { status: 500 }
    );
  }
}