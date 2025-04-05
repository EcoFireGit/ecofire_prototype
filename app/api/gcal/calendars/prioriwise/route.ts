import { NextResponse } from 'next/server';
import { createPrioriCalendar } from '@/lib/services/gcal.service';
import { validateAuth } from '@/lib/utils/auth-utils';

export async function POST(request: Request) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const prioriCalendar = await request.json();
    const savedPrioriCalendar= await createPrioriCalendar(userId);

    return NextResponse.json({
      success: true,
      data: savedPrioriCalendar
    }, { status: 200 });
  } catch (error) {
    console.log('error:', error);
    return NextResponse.json(
      { error: 'Failed to create Prioriwise calendars' },
      { status: 500 }
    );
  }
}