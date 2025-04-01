import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrioriCalendar } from '@/lib/services/gcal.service';

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