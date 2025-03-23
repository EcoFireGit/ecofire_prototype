
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { businessName, businessIndustry, businessDescription } = data;

    // Here you would typically save this data to your database
    // For now, we'll just return success
    console.log("Received onboarding data:", { businessName, businessIndustry, businessDescription });

    return NextResponse.json({ 
      success: true, 
      message: "Onboarding information saved successfully" 
    });
    
  } catch (error) {
    console.error("Error in onboarding API:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
