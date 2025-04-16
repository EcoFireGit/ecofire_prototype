
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { QBOJobMappingService } from "@/lib/services/qbo-job-mapping.service";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    // Get query parameters
    const url = new URL(req.url);
    const qboId = url.searchParams.get("qboId");
    const includeDetails = url.searchParams.get("includeDetails") === "true";
    
    if (!qboId) {
      return NextResponse.json(
        { 
          success: false,
          error: "QBO ID is required as a query parameter" 
        },
        { status: 400 }
      );
    }
    
    const qboJobMappingService = new QBOJobMappingService();
    
    let results;
    if (includeDetails) {
      results = await qboJobMappingService.getJobsWithMappingDetails(qboId, userId!);
    } else {
      results = await qboJobMappingService.getJobsMappedToQBO(qboId, userId!);
    }
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching QBO-Job mappings:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error" 
      },
      { status: 500 }
    );
  }
}
