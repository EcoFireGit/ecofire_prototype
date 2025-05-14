// lib/services/job-duplication.service.ts
// This service handles the duplication of jobs, including all their tasks and mappings

import { JobService } from "./job.service";
import { TaskService } from "./task.service";
import { MappingService } from "./pi-job-mapping.service";
import { Task } from "@/lib/models/task.model";
import { Jobs } from "@/lib/models/job.model";

export class JobDuplicationService {
  private jobService: JobService;
  private taskService: TaskService;
  private mappingService: MappingService;

  constructor() {
    // Initialize service instances
    this.jobService = new JobService();
    this.taskService = new TaskService();
    this.mappingService = new MappingService();
  }

  /**
   * Duplicates a job with all its tasks and PI-job mappings
   * @param sourceJobId - ID of the job to duplicate
   * @param newJobData - Data for the new job
   * @param userId - User ID
   * @returns The newly created job
   */
  async duplicateJob(
    sourceJobId: string,
    newJobData: Partial<Jobs>,
    userId: string,
  ): Promise<Jobs> {
    // Get the source job
    const sourceJob = await this.jobService.getJobById(sourceJobId, userId);

    if (!sourceJob) {
      throw new Error("Source job not found");
    }

    // Create the duplicated job
    const jobResponse = await this.jobService.createJob(
      {
        ...newJobData,
        tasks: [],
        nextTaskId: undefined,
      },
      userId,
    );

    const newJobId = jobResponse._id;
    const newJobTitle = jobResponse.title;

    // Fetch tasks of the original job
    const tasksResult = await this.taskService.getTasksByJobId(
      sourceJobId,
      userId,
    );

    if (tasksResult && tasksResult.length > 0) {
      // Keep track of newly created tasks
      const newTasksMap: Record<string, string> = {}; // Maps original task titles to new task IDs
      const newTaskIds: string[] = []; // Array to store all new task IDs

      // Create new tasks for the duplicated job
      for (const task of tasksResult) {
        // Prepare the new task data
        const newTask: Partial<Task> = {
          ...task,
          jobId: newJobId,
          completed: false,
        };
        delete newTask._id;
        delete newTask.id;
        delete newTask.date;

        // Create the task
        const taskResult = await this.taskService.createTask(newTask, userId);

        if (taskResult) {
          // Store the new task ID with its title as key
          newTasksMap[task.title] = taskResult._id;
          newTaskIds.push(taskResult._id);
        }
      }

      // Update the job with the list of new task IDs
      await this.jobService.updateJob(newJobId, userId, { tasks: newTaskIds });

      // If the source job has a next task, find the corresponding task in the new job
      if (sourceJob.nextTaskId) {
        // Find the title of the next task in the original job
        const nextTaskDetails = tasksResult.find(
          (task: Task) =>
            task.id === sourceJob.nextTaskId ||
            task._id === sourceJob.nextTaskId,
        );

        if (nextTaskDetails && newTasksMap[nextTaskDetails.title]) {
          // Set the nextTaskId of the new job
          await this.jobService.updateJob(newJobId, userId, {
            nextTaskId: newTasksMap[nextTaskDetails.title],
          });
        }
      }

      // Set first task as nextTaskId if none is set
      await this.jobService.setFirstTaskAsNextTaskId(newJobId);
    }

    // Duplicate PI-job mappings
    try {
      // Fetch all PI-job mappings to find those associated with the original job
      const originalJobMappings =
        await this.mappingService.getMappingsByJobId(sourceJobId);

      // Create new mappings for each original mapping
      if (originalJobMappings && originalJobMappings.length > 0) {
        for (const mapping of originalJobMappings) {
          // Prepare the new mapping data
          const newMapping = {
            jobId: newJobId,
            jobName: newJobTitle,
            piId: mapping.piId,
            piName: mapping.piName,
            piImpactValue: mapping.piImpactValue,
            piTarget: mapping.piTarget || 0,
            notes: `Duplicated from job: ${sourceJob.title}`,
          };

          // Create the mapping
          await this.mappingService.CreateMapping(newMapping, userId);
        }
      }
    } catch (error) {
      console.error("Error duplicating PI-job mappings:", error);
      // Continue execution even if mapping duplication fails
    }

    // Update job impact values
    try {
      const { updateJobImpactValues } = await import(
        "@/lib/services/job-impact.service"
      );
      await updateJobImpactValues(userId);
    } catch (error) {
      console.error("Error updating job impact values:", error);
    }

    return jobResponse;
  }
}
