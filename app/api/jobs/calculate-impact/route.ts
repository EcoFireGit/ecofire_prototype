
import { NextResponse } from "next/server";
import { updateJobImpactValues } from "@/lib/services/job-impact.service";
import { validateAuth } from "@/lib/utils/auth-utils";

export async function POST() {
  try {
    const authResult = await validateAuth();
        
        if (!authResult.isAuthorized) {
          return authResult.response;
        }
        
        const userId = authResult.userId;

    const result = await updateJobImpactValues(userId!);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
