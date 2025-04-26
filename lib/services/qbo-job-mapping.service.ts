import { JobService } from "./job.service";
import { PIQBOMappingService } from "./pi-qbo-mapping.service";
import { MappingService } from "./pi-job-mapping.service";
import { Jobs } from "../models/job.model";
import dbConnect from "../mongodb";

export class QBOJobMappingService {
  private jobService: JobService;
  private piQboMappingService: PIQBOMappingService;
  private piJobMappingService: MappingService;

  constructor() {
    this.jobService = new JobService();
    this.piQboMappingService = new PIQBOMappingService();
    this.piJobMappingService = new MappingService();
  }

  async getJobsMappedToQBO(qboId: string, userId: string): Promise<Jobs[]> {
    try {
      await dbConnect();

      // Step 1: Get all PI-QBO mappings for this QBO
      const piQboMappings = await this.piQboMappingService.getMappingsForQBO(
        qboId,
        userId,
      );
      if (!piQboMappings || piQboMappings.length === 0) {
        return [];
      }

      // Step 2: Extract all PI IDs mapped to this QBO
      const piIds = piQboMappings.map((mapping) => mapping.piId);

      // Step 3: Get all job-PI mappings for these PIs
      const jobPiMappings = await Promise.all(
        piIds.map((piId) =>
          this.piJobMappingService
            .getAllMappingJP(userId)
            .then((mappings) =>
              mappings.filter((mapping) => mapping.piId === piId),
            ),
        ),
      );

      // Flatten the array of arrays
      const allJobPiMappings = jobPiMappings.flat();

      // Step 4: Extract all unique job IDs
      const jobIds = [
        ...new Set(allJobPiMappings.map((mapping) => mapping.jobId)),
      ];

      // Step 5: Get complete job data for all these job IDs
      const jobs = await Promise.all(
        jobIds.map((jobId) => this.jobService.getJobById(jobId, userId)),
      );

      // Filter out null values (in case any jobs were deleted or don't exist)
      // Also filter out completed jobs
      return jobs
        .filter((job) => job !== null)
        .filter((job) => !job.isDone) as Jobs[];
    } catch (error) {
      console.error("Error getting jobs mapped to QBO:", error);
      throw new Error("Error retrieving jobs mapped to QBO");
    }
  }

  async getJobsWithMappingDetails(
    qboId: string,
    userId: string,
  ): Promise<any[]> {
    try {
      await dbConnect();

      // Get basic jobs first
      const jobs = await this.getJobsMappedToQBO(qboId, userId);

      // Get all PI-QBO mappings for this QBO
      const piQboMappings = await this.piQboMappingService.getMappingsForQBO(
        qboId,
        userId,
      );

      // Get all job-PI mappings
      const allJobPiMappings =
        await this.piJobMappingService.getAllMappingJP(userId);

      // Enhance job data with mapping details
      return jobs.map((job) => {
        // Find all PI mappings for this job
        const jobPiMappings = allJobPiMappings.filter(
          (mapping) => mapping.jobId === job._id,
        );

        // Calculate the impact path from job through PIs to QBO
        const impactPaths = jobPiMappings
          .map((jobPiMapping) => {
            const relatedPiQboMapping = piQboMappings.find(
              (mapping) => mapping.piId === jobPiMapping.piId,
            );

            if (relatedPiQboMapping) {
              return {
                piId: jobPiMapping.piId,
                piName: jobPiMapping.piName,
                piImpactValue: jobPiMapping.piImpactValue,
                piTarget: jobPiMapping.piTarget || 0,
                qboImpact: relatedPiQboMapping.qboImpact,
                jobContribution:
                  (jobPiMapping.piImpactValue / (jobPiMapping.piTarget || 1)) *
                  relatedPiQboMapping.qboImpact,
              };
            }
            return null;
          })
          .filter((path) => path !== null);

        return {
          ...job,
          impactPaths,
          totalQBOContribution: impactPaths.reduce(
            (sum, path) => sum + (path?.jobContribution || 0),
            0,
          ),
        };
      });
    } catch (error) {
      console.error("Error getting jobs with mapping details:", error);
      throw new Error("Error retrieving job mapping details");
    }
  }
}
