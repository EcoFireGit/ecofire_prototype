// app/api/task-tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import TaskTag from "@/lib/models/task-tag.model";
import connectMongo from "@/lib/mongodb";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    await connectMongo();
    
    const tags = await TaskTag.find({ userId }).sort({ name: 1 });
    
    return NextResponse.json({ 
      success: true, 
      count: tags.length,
      data: tags 
    });
  } catch (error: any) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 }
      );
    }

    await connectMongo();
    
    // Use findOneAndUpdate with upsert to avoid duplicates
    const tag = await TaskTag.findOneAndUpdate(
      { userId, name },
      { userId, name },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ 
      success: true, 
      data: tag 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}