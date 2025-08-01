import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { JobService } from "@/lib/services/job.service";
import { PIService } from "@/lib/services/pi.service";
import { QBOService } from "@/lib/services/qbo.service";
import { MappingService } from "@/lib/services/pi-job-mapping.service";
import { PIQBOMappingService } from "@/lib/services/pi-qbo-mapping.service";

export async function GET(request: NextRequest) {
  const authResult = await validateAuth();

  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  try {
    const jobService = new JobService();
    const piService = new PIService();
    const qboService = new QBOService();
    const piJobMappingService = new MappingService();
    const piQboMappingService = new PIQBOMappingService();

    // Get all active jobs
    const jobs = await jobService.getAllJobs(authResult.userId!);
    const activeJobs = jobs.filter(job => !job.isDone);

    // Get all PIs (outputs)
    const pis = await piService.getAllPIs(authResult.userId!);

    // Get all QBOs (outcomes)
    const qbos = await qboService.getAllQBOs(authResult.userId!);

    // Get all job-PI mappings
    const jobPiMappings = await piJobMappingService.getAllMappingJP(authResult.userId!);

    // Get all PI-QBO mappings
    const piQboMappings = await piQboMappingService.getAllMappings(authResult.userId!);
    




    // Build the mapping data
                 const mappingData = {
               jobs: activeJobs.map(job => ({
                 id: job._id,
                 name: job.title,
                 businessFunctionId: job.businessFunctionId
               })),
               outputs: pis.map(pi => ({
                 id: pi._id,
                 name: pi.name,
                 unit: pi.unit,
                 targetValue: pi.targetValue,
                 beginningValue: pi.beginningValue
               })),
               outcomes: qbos.map(qbo => ({
                 id: qbo._id,
                 name: qbo.name,
                 unit: qbo.unit,
                 targetValue: qbo.targetValue,
                 currentValue: qbo.currentValue,
                 beginningValue: qbo.beginningValue,
                 points: qbo.points
               })),
               jobOutputMappings: jobPiMappings.map((mapping: any) => ({
                 jobId: mapping.jobId,
                 jobName: mapping.jobName,
                 outputId: mapping.piId,
                 outputName: mapping.piName,
                 impactValue: mapping.piImpactValue,
                 target: mapping.piTarget
               })),
               outputOutcomeMappings: piQboMappings.map((mapping: any) => {
                 // Find the actual outcome name from the QBOs array if qboName is empty
                 const actualOutcome = qbos.find(qbo => qbo._id === mapping.qboId);
                 const outcomeName = mapping.qboName && mapping.qboName.trim() !== '' 
                   ? mapping.qboName 
                   : (actualOutcome ? actualOutcome.name : 'Unknown Outcome');
                 
                 return {
                   outputId: mapping.piId,
                   outputName: mapping.piName,
                   outcomeId: mapping.qboId,
                   outcomeName,
                   impact: mapping.qboImpact,
                   outputTarget: mapping.piTarget,
                   outcomeTarget: mapping.qboTarget
                 };
               })
             };

    return NextResponse.json({
      success: true,
      data: mappingData
    });
  } catch (error) {
    console.error("Error fetching mapping data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch mapping data"
      },
      { status: 500 }
    );
  }
} 