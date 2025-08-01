import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { UserPreferencesService } from "@/lib/services/user-preferences.service";

export async function GET(request: NextRequest) {
  const authResult = await validateAuth();

  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  try {
    const userPreferencesService = new UserPreferencesService();
    const preferences = await userPreferencesService.getUserPreferences(authResult.actualUserId!);

    return NextResponse.json({
      success: true,
      data: {
        hasBackstageAccess: preferences.enableBackstage
      }
    });
  } catch (error) {
    console.error("Error checking backstage access:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check backstage access"
      },
      { status: 500 }
    );
  }
} 