import { NextResponse } from "next/server";
import {
  createPrioriCalendar,
  getPrioriCalendarId,
} from "@/lib/services/gcal.service";
import { validateAuth } from "@/lib/utils/auth-utils";

export async function POST(request: Request) {
  try {
    const authResult = await validateAuth();

    if (!authResult.isAuthorized) {
      return authResult.response;
    }

    const userId = authResult.actualUserId;
    const prioriCalendar = await request.json();
    const { calendar: savedPrioriCalendar, alreadyExists } =
      await createPrioriCalendar(userId!);

    return NextResponse.json(
      {
        success: true,
        data: savedPrioriCalendar,
        alreadyExists,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("error:", error);
    return NextResponse.json(
      { error: "Failed to create Prioriwise calendars" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const authResult = await validateAuth();

    if (!authResult.isAuthorized) {
      return authResult.response;
    }

    const userId = authResult.actualUserId;
    const calendarId = await getPrioriCalendarId(userId!);

    return NextResponse.json(
      {
        success: true,
        calendarId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Prioriwise calendar ID" },
      { status: 500 },
    );
  }
}
