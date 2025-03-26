// app/api/tasks/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Task from "@/lib/models/task.model";
import connectMongo from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get task IDs from query parameters
    const url = new URL(request.url);
    const ids = url.searchParams.getAll('ids');

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No task IDs provided" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Find tasks with the provided IDs and belonging to the authenticated user
    const tasks = await Task.find({
      _id: { $in: ids },
      userId: userId
    }).lean();

    // Format tasks for response
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      owner: task.owner,
      date: task.date,
      requiredHours: task.requiredHours,
      focusLevel: task.focusLevel,
      joyLevel: task.joyLevel,
      notes: task.notes,
      tags: task.tags || [],
      jobId: task.jobId,
      completed: task.completed
    }));

    return NextResponse.json({
      success: true,
      data: formattedTasks
    });
  } catch (error) {
    console.error("Error in GET /api/tasks/batch:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}