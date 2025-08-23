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
    const userId = authResult.actualUserId;

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    // If type is "all", return all notifications for the user
    if (type === "all") {
      const notifications = await notificationService.getAllNotificationsForUser(userId!);
      return NextResponse.json(
        { success: true, data: notifications },
        { status: 200 },
      );
    }

    // If type is "count", return unread count
    if (type === "count") {
      const count = await notificationService.getUnreadNotificationCount(userId!);
      return NextResponse.json(
        { success: true, data: count },
        { status: 200 },
      );
    }

    // Default behavior: get calendar notifications
    const currentTimeParam = url.searchParams.get("currentTime");
    const currentTime = currentTimeParam
      ? new Date(currentTimeParam)
      : new Date();

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
