// app/api/task-tags/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';
import TaskTag from "@/lib/models/task-tag.model";
import connectMongo from "@/lib/mongodb";

// GET endpoint to fetch a single tag by ID or name
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    await connectMongo();
    const { id } = await params;
    let tag;
    
    // Check if id is a MongoDB ObjectId or a tag name
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      // If it looks like a MongoDB ObjectId, query by _id
      tag = await TaskTag.findOne({ _id: id, userId });
    } else {
      // Otherwise, assume it's a tag name and decode it
      const decodedName = decodeURIComponent(id);
      tag = await TaskTag.findOne({ name: decodedName, userId });
    }
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error("Error in GET /api/task-tags:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    await connectMongo();
    const { id } = await params;
   
    // Delete the tag
    const result = await TaskTag.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }
    
    // To make this more robust, you could also update all tasks
    // that use this tag to remove it from their tags array
    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/task-tags:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}