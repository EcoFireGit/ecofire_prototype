
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';
import { MissionService } from "@/lib/services/mission.service";

// GET endpoint to retrieve the mission statement
export async function GET(req: NextRequest) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const missionService = new MissionService();
    const mission = await missionService.getMission();

    return NextResponse.json(mission || { statement: "" });
  } catch (error) {
    console.error("Error retrieving mission statement:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST endpoint to update the mission statement
export async function POST(req: NextRequest) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const data = await req.json();
    
    if (!data.statement) {
      return NextResponse.json(
        { error: "Mission statement is required" },
        { status: 400 }
      );
    }

    const missionService = new MissionService();
    const updatedMission = await missionService.updateMission(data.statement);

    return NextResponse.json(updatedMission);
  } catch (error) {
    console.error("Error updating mission statement:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
