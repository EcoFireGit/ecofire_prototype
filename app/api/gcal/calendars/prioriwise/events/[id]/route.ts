import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import createEvent, {updateEvent, deleteEvent} from '@/lib/services/gcal.events.service';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
  ) {
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
    const prioriUpdateEvent = await request.json();
    const { id } = await params;  // Awaiting params to get id

    const savedPrioriCalendarEvent= await updateEvent (userId,id , prioriUpdateEvent);

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

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
  ) {
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
        // Ensure params is awaited before using its properties
    const { id } = await params;  // Awaiting params to get id
    
    const deletedPrioriCalendarEvent= await deleteEvent (userId, id);

    return NextResponse.json({
      success: true,
      data: deletedPrioriCalendarEvent
    }, { status: 200 });
  } catch (error) {
    console.log('error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event in Prioriwise calendar' },
      { status: 500 }
    );
  }  
}  
