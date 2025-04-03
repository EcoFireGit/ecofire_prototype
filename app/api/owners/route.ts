
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';
import ownerService from "@/lib/services/owner.service";

export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const owners = await ownerService.getAllOwners(userId!);
    return NextResponse.json(owners);
  } catch (error) {
    console.error("Failed to get owners:", error);
    return NextResponse.json(
      { error: "Failed to get owners" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const owner = await ownerService.createOwner(name, userId!);
    return NextResponse.json(owner);
  } catch (error) {
    console.error("Failed to create owner:", error);
    return NextResponse.json(
      { error: "Failed to create owner" },
      { status: 500 }
    );
  }
}
