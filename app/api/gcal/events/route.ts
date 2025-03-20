// import { NextRequest, NextResponse } from 'next/server';
// import { getCalendarEvents } from '@/lib/services/gcal.service';

// export async function POST(req: NextRequest) {
//   try {
//     const { calendars } = await req.json();
//     const events = await getCalendarEvents(calendars);
//     return NextResponse.json(events);
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to fetch events' },
//       { status: 500 }
//     );
//   }
// }
