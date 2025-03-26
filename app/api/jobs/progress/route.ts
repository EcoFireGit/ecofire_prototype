// app/api/jobs/progress/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { TaskProgressService } from '@/lib/services/task-progress.service';
import { auth } from '@clerk/nextjs/server';

const taskProgressService = new TaskProgressService();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }
    
    // Get job IDs from query parameters
    const url = new URL(request.url);
    const jobIds = url.searchParams.getAll('ids');
    
    if (!jobIds || jobIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one job ID is required'
        },
        { status: 400 }
      );
    }
    
    // Calculate progress for all jobs
    const progressData = await taskProgressService.calculateMultipleJobsProgress(jobIds, userId);
    
    return NextResponse.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    console.error('Error in GET /api/jobs/progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

// API endpoint to get task counts for a specific job
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }
    
    // Get job ID from request body
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job ID is required'
        },
        { status: 400 }
      );
    }
    
    // Get task counts for the job
    const taskCounts = await taskProgressService.getTaskCounts(jobId, userId);
    
    return NextResponse.json({
      success: true,
      data: taskCounts
    });
  } catch (error) {
    console.error('Error in POST /api/jobs/progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}