import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import ownerService from "@/lib/services/owner.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
   
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const id = (await params).id;
    const body = await request.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    
    const owner = await ownerService.updateOwner(id, name, userId);
   
    if (!owner) {
      return NextResponse.json(
        { error: "Owner not found" },
        { status: 404 }
      );
    }
   
    return NextResponse.json(owner);
  } catch (error) {
    console.error("Failed to update owner:", error);
    return NextResponse.json(
      { error: "Failed to update owner" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
   
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const id = (await params).id;
    const success = await ownerService.deleteOwner(id, userId);
   
    if (!success) {
      return NextResponse.json(
        { error: "Owner not found" },
        { status: 404 }
      );
    }
   
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete owner:", error);
    return NextResponse.json(
      { error: "Failed to delete owner" },
      { status: 500 }
    );
  }
}