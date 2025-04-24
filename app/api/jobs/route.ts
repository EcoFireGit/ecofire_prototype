// route: /api/jobs
// description: Get all jobs
import { NextResponse } from 'next/server';
import { JobService } from '@/lib/services/job.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { JobPIMappingGenerator } from '@/lib/services/job-pi-mapping-generator';
import { BusinessInfoService } from '@/lib/services/business-info.service';

const jobService = new JobService();
const mappingGenerator = new JobPIMappingGenerator();
const businessInfoService = new BusinessInfoService();

export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const jobs = await jobService.getAllJobs(userId!);
   
    return NextResponse.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Error in GET /api/jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const jobData = await request.json();
    const job = await jobService.createJob(jobData, userId!);

    // Get business info to provide context for the mapping generation
    let businessDescription = "";
    try {
      const businessInfo = await businessInfoService.getBusinessInfo(userId!);
      businessDescription = businessInfo?.missionStatement || "";
    } catch (error) {
      console.error("Error fetching business info:", error);
      // Continue even if we can't get the business description
    }

    // Generate mappings for the new job
    try {
      await mappingGenerator.generateMappingsForJob(userId!, job, businessDescription);
      
      // Calculate job impact values after creating mappings
      try {
        const { updateJobImpactValues } = await import('@/lib/services/job-impact.service');
        await updateJobImpactValues(userId!);
      } catch (error) {
        console.error("Error updating job impact values:", error);
      }
    } catch (mappingError) {
      console.error("Error generating PI mappings for job:", mappingError);
      // Continue even if mapping generation fails
    }

    return NextResponse.json({
      success: true,
      data: job
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}