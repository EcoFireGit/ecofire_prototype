// route: /api/jobs
// description: Get all jobs
import { NextResponse } from "next/server";
import { JobService } from "@/lib/services/job.service";
import { validateAuth } from "@/lib/utils/auth-utils";
import { JobPIMappingGenerator } from "@/lib/services/job-pi-mapping-generator";
import { BusinessInfoService } from "@/lib/services/business-info.service";
import { currentUser } from '@clerk/nextjs/server';
import { UserOrganizationService } from "@/lib/services/userOrganization.service";
import { ClerkProviderService } from '@/lib/services/clerk-provider.service';
import { cookies } from 'next/headers';
const ACTIVE_ORG_COOKIE = 'ecofire_active_org';


const jobService = new JobService();
const mappingGenerator = new JobPIMappingGenerator();
const businessInfoService = new BusinessInfoService();
const userOrgService = new UserOrganizationService();

export async function GET() {
  try {
    const authResult = await validateAuth();

    if (!authResult.isAuthorized) {
      return authResult.response;
    }

    const userId = authResult.userId;

    await addToOrganizationIfInvited();

    const jobs = await jobService.getAllJobs(userId!);

    return NextResponse.json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error("Error in GET /api/jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

async function addToOrganizationIfInvited() {
  const user = await currentUser();
  if (user && user.emailAddresses && user.emailAddresses.length > 0 && (user.publicMetadata?.orgId != undefined)) {
    //make user member of the org
    console.log("Adding user", user.emailAddresses[0].emailAddress, "to org id ", user.publicMetadata.orgId);
    const orgId = user.publicMetadata.orgId;
    let role = user.publicMetadata.role;
    if (role !== "admin" && role !== "member") {
      role = "member";
    }

    const email = user.emailAddresses[0].emailAddress;
    if(! await userOrgService.isUserInOrganization(user.id, orgId as string)){
      await userOrgService.addUserToOrganization(user.id, orgId as string, role as 'admin' | 'member', email);
    }

    const cookieStore = await cookies();

    // Set the active organization in a cookie
    cookieStore.set(ACTIVE_ORG_COOKIE, JSON.stringify(orgId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
        
    const clerkProviderService = new ClerkProviderService();
    clerkProviderService.resetPublicMetadata(user.id);
        
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
      await mappingGenerator.generateMappingsForJob(
        userId!,
        job,
        businessDescription,
      );
    } catch (mappingError) {
      console.error("Error generating Output mappings for job:", mappingError);
      // Continue even if mapping generation fails
    }

    // Always calculate job impact values whether it's a new or duplicated job
    try {
      const { updateJobImpactValues } = await import(
        "@/lib/services/job-impact.service"
      );
      await updateJobImpactValues(userId!);
    } catch (error) {
      console.error("Error updating job impact values:", error);
    }

    return NextResponse.json(
      {
        success: true,
        data: job,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

