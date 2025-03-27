import Job from "../models/job.model";
import QBO from "../models/qbo.model";
import PI from "../models/pi.model";
import PIQBOMapping from "../models/pi-qbo-mapping.model";
import MappingJobToPI from "../models/pi-job-mapping.model";
import dbConnect  from "../mongodb";

export async function updateJobImpactValues(userId: string) {
  try {
    await dbConnect();
    // 1. Get all QBOs, PIs, jobs & mappings and initialize impact to 0
    const QBOs = await QBO.find({ userId });
    const PIs = await PI.find({ userId });
    const jobs = await Job.find({ userId });
    for (const job of jobs) {
      job.impact = 0;
      await job.save();
    }
    // 2. Get all mappings
    const PIQBOmappings = await PIQBOMapping.find({ userId });
    const JobPImappings = await MappingJobToPI.find({ userId });
    // 3. Create a map to efficiently aggregate values
    const QBOPointsMap = new Map<string, number>();
    const PIPointsMap = new Map<string, [number,number]>();
    const jobImpactMap = new Map<string, number>();
    QBOs.forEach(qbo => QBOPointsMap.set(qbo._id.toString(), qbo.points/(qbo.targetValue - qbo.beginningValue) || NaN));
    PIs.forEach(pi => PIPointsMap.set(pi._id.toString(), [0, pi.targetValue - pi.beginningValue]));
    // 4. Process all mappings to calculate impact values
    PIQBOmappings.forEach(mapping => {
      const piId = mapping.piId;
      const qboId = mapping.qboId;
      const piPointsValues = PIPointsMap.get(piId) || [0, 0];
      const impactValue = mapping.qboImpact || 0;
      const piPoints = impactValue * (QBOPointsMap.get(qboId) || 0);
      // Add to the existing value or initialize
      PIPointsMap.set(piId, [piPointsValues[0] + piPoints, piPointsValues[1]]);
    });
    JobPImappings.forEach(mapping => {
      const jobId = mapping.jobId;
      const piId = mapping.piId;
      const impactValue = mapping.piImpactValue || 0;
      const piPointsValues = PIPointsMap.get(piId) || [0, 1]; // Avoid division by zero
      
      // Add to the existing value or initialize
      jobImpactMap.set(jobId, (jobImpactMap.get(jobId) || 0) + impactValue * piPointsValues[0] / piPointsValues[1]);
    });
    // 5. Update all jobs with their calculated impact values
    const updatePromises = Array.from(jobImpactMap.entries()).map(([jobId, impactValue]) => {
      return Job.findByIdAndUpdate(jobId, { impact: impactValue });
    });
    await Promise.all(updatePromises);
    return {
      success: true,
      jobsUpdated: updatePromises.length,
      message: `Updated impact values for ${updatePromises.length} jobs`
    };
  } catch (error) {
    console.error("Error updating job impact values:", error);
    return {
      success: false,
      message: "Failed to update job impact values",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}