
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MissionService } from "@/lib/services/mission.service";

// GET endpoint to retrieve the mission statement
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

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
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

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
