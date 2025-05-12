// route: /api/jobs/duplicate
// description: API endpoint for duplicating a job with all its tasks and mappings
import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';
import { JobDuplicationService } from '@/lib/services/job-duplication.service';

export async function POST(request: Request) {
  try {
    // Validate authentication
    const authResult = await validateAuth();

    if (!authResult.isAuthorized) {
      return authResult.response;
    }

    const userId = authResult.userId;

    // Parse request body
    const { sourceJobId, newJobData } = await request.json();

    if (!sourceJobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source job ID is required'
        },
        { status: 400 }
      );
    }

    // Use the new job duplication service
    const jobDuplicationService = new JobDuplicationService();

    try {
      // Duplicate the job with all its tasks and mappings
      const jobResponse = await jobDuplicationService.duplicateJob(
        sourceJobId,
        newJobData,
        userId!
      );

      return NextResponse.json({
        success: true,
        data: jobResponse
      }, { status: 201 });

    } catch (error: any) {
      // Check if this is an error from our service
      if (error.message === 'Source job not found') {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 404 }
        );
      }

      // Re-throw other errors to be caught by the outer try-catch
      throw error;
    }

  } catch (error) {
    console.error('Error in POST /api/jobs/duplicate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}