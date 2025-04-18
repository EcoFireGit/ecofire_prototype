import { NextResponse, NextRequest } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { NotificationService } from "@/lib/services/notification.service";
import { use } from "react";
import { datacatalog } from "googleapis/build/src/apis/datacatalog";

const notificationService = new NotificationService();

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth();

    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    const userId = authResult.userId;
    // Enhanced validation

    const url = new URL(request.url);
    const currentTimeParam = url.searchParams.get("currentTime"); // Get the 'currentTime' query parameter

    const currentTime = currentTimeParam
      ? new Date(currentTimeParam)
      : new Date();

    // Convert currentTime string to a Date object
    const notifications =
      await notificationService.getFirstUnseenNotificationsAfterCurrentTimeForUser(
        userId!,
        currentTime,
      );

    return NextResponse.json(
      { success: true, data: notifications },
      { status: 200 },
    );
  } catch (error) {
    console.error("Notification get error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
