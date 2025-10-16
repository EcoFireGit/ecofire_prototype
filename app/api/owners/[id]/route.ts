import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';
import ownerService from "@/lib/services/owner.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
   
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
   
    const currentUserId = authResult.isOrganization ? authResult.userId : authResult.actualUserId;
    const { id } = await params;
    const body = await request.json();
    const { name, userId } = body;
    
    console.log('PUT /api/owners/[id] - Received:', { id, name, userId, currentUserId });
    
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
   
    const owner = await ownerService.updateOwner(id, name, userId, currentUserId!);
   
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
    const authResult = await validateAuth();
   
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
   
    const currentUserId = authResult.isOrganization ? authResult.userId : authResult.actualUserId;
    const { id } = await params;
    const success = await ownerService.deleteOwner(id, currentUserId!);
   
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