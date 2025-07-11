import Task  from '../models/task.model';
import Job from '../models/job.model';
import { Jobs } from '../models/job.model';
import dbConnect from '../mongodb';
import { Types } from 'mongoose';

export class JobService {
  async setIncompleteTaskAsNextStep(jobId: string, taskId: string): Promise<Jobs | null> {
    try {
      await dbConnect();
      const job = await Job.findById(jobId);
      if(!job || !job.tasks){
        console.log(`Job ${jobId} or tasks not found`);
        return null;
      }

      if(!job.tasks.includes(taskId)){
        console.log(`TaskId ${taskId} not found in job ${jobId} tasks array`);
        return null;
      } 

      if(job.nextTaskId !== taskId){
        console.log(`Task ${taskId} is not the current next task, no update needed`);
        return job;
      }
        //find the task from the array that is not comple
        // te and set it as nextTask
      const nextTask = await this.getFirstIncompleteTask(job.tasks);
      
      if (!nextTask) {
        console.log(`No incomplete tasks found for job ${jobId}, clearing nextTaskId`);
        const updatedJob = await Job.findOneAndUpdate(
          { _id: jobId },
          { nextTaskId: null },
          { new: true }
        );
        return updatedJob;
      }
      
      const updatedJob = await Job.findOneAndUpdate(
        { _id: jobId },
        { nextTaskId: nextTask }, // Specify the fields to update
        { new: true }  // returns the updated document
      );

      console.log(`Successfully set next task ${nextTask} for job ${jobId}`);
      return updatedJob;
    } catch (error) {
      console.error('Error in setIncompleteTaskAsNextStep:', error);
      return null;
    }
  }

  async  getFirstIncompleteTask(taskIds: string[]): Promise<string | null> {
    // Pull only the tasks you care about
  
    for (let i = 0; i < taskIds.length; i++) {

      const foundTask = await Task.findOne({ _id: taskIds[i] }); // Use findOne for equality

      if (foundTask && foundTask.completed === false && foundTask.isDeleted === false) {
        return foundTask.id; // Return the ID of the first incomplete task
      }

    }
    return null;

  }

/**
* Migrates jobs that don't have a createdDate field by setting them to a fallback date.
* This function ensures backward compatibility for jobs created before the createdDate
* field was implemented, preventing them from showing current timestamps inappropriately.
 * 
 * @description
 * - Connects to the database using dbConnect()
* - Sets fallback date to Mother's Day 2025 (2025-05-11) as a meaningful reference point
* - Finds all jobs for the specified user that either:
*   - Don't have a createdDate field (field doesn't exist)
*   - Have a null createdDate value
* - Updates all matching jobs with the fallback date
* - Logs errors to console and re-throws them for upstream handling
* - Runs automatically before fetching jobs to ensure data consistency
 * 
 * @example
* // Called automatically in getAllJobs before returning job data
* await this.migrateJobsCreatedDate(userId);
 */

  async migrateJobsCreatedDate(userId: string): Promise<void> {
  try {
    await dbConnect();
    const fallbackDate = new Date('2025-05-11T00:00:00.000Z'); // Mother's Day
    await Job.updateMany(
      { 
        userId, 
        $or: [
          { createdDate: { $exists: false } },
          { createdDate: null }
        ]
      },
      { 
        $set: { createdDate: fallbackDate } 
      }
    );
  } catch (error) {
    console.error('Error migrating job createdDate:', error);
    throw error;
  }
}
  

async getAllJobs(userId: string): Promise<Jobs[]> {
  try {
    await dbConnect();
    await this.migrateJobsCreatedDate(userId);
    await this.migrateJobNumbers(userId);
    const jobs = await Job.find({ 
      userId, 
      $or: [
        { isDeleted: { $eq: false } },
        { isDeleted: { $exists: false } }
      ] 
    }).lean();
    
    return JSON.parse(JSON.stringify(jobs));
  } catch (error) {
    console.error('Error in getAllJobs:', error);
    throw new Error('Error fetching jobs from database');
  }
}

  async getJobById(id: string, userId: string): Promise<Jobs | null> {
    try {
      await dbConnect();
      const job = await Job.findOne({ _id: id, isDeleted: false }).lean();
      return job ? JSON.parse(JSON.stringify(job)) : null;
    } catch (error) {
      throw new Error('Error fetching job from database');
    }
  }

 /**
 * Migrates jobs that don't have a jobNumber field by assigning sequential numbers.
 * This function ensures backward compatibility for jobs created before the jobNumber
 * field was implemented, maintaining chronological order based on creation date.
 * 
 * @description
 * - Connects to the database using dbConnect()
 * - Finds all jobs for the specified user that either:
 *   - Don't have a jobNumber field (field doesn't exist)
 *   - Have a null jobNumber value
 * - Sorts jobs by createdDate (ascending) then by _id to maintain chronological order
 * - Gets the highest existing jobNumber for the user as starting point
 * - Assigns sequential numbers starting from (lastJobNumber + 1)
 * - Updates all jobs without numbers in a single batch operation
 * - Logs migration progress to console for monitoring
 * - Runs automatically before fetching jobs to ensure data consistency
 * 
 * @example
 * // Called automatically in getAllJobs before returning job data
 * await this.migrateJobNumbers(userId);
 * 
 * // Existing jobs without numbers get sequential IDs:
 * // Job A (created first) -> #1
 * // Job B (created second) -> #2
 * // Job C (created third) -> #3
 */ 

async migrateJobNumbers(userId: string): Promise<void> {
  try {
    await dbConnect();
    
    const jobsWithoutNumbers = await Job.find({ 
      userId, 
      $or: [
        { jobNumber: { $exists: false } },
        { jobNumber: null }
      ]
    }).sort({ createdDate: 1, _id: 1 }).lean();

    if (jobsWithoutNumbers.length === 0) {
      return;
    }

    const lastNumberedJob = await Job.findOne({ 
      userId, 
      jobNumber: { $exists: true, $ne: null } 
    }).sort({ jobNumber: -1 }).select('jobNumber').lean() as { jobNumber?: number } | null;

    let nextNumber = (lastNumberedJob?.jobNumber || 0) + 1;

    const updatePromises = jobsWithoutNumbers.map(job => 
      Job.updateOne(
        { _id: job._id },
        { $set: { jobNumber: nextNumber++ } }
      )
    );

    await Promise.all(updatePromises);
    
    console.log(`Migrated ${jobsWithoutNumbers.length} jobs with job numbers for user ${userId}`);
  } catch (error) {
    console.error('Error migrating job numbers:', error);
    throw error;
  }
}

/**
 * Generates the next sequential job number for a specific view context.
 * Ensures each view context (personal or organization) has their own independent 
 * numbering sequence starting from 1. In organization contexts, all members
 * share the same numbering sequence for collaborative job management.
 * 
 * @description
 * - Queries the database to find the highest existing jobNumber for the view context
 * - Returns the next number in sequence (lastJobNumber + 1)
 * - If no jobs exist for the view context, starts numbering from 1
 * - Includes fallback error handling using job count as backup
 * - Used during job creation to assign unique, sequential identifiers
 * - Numbers are scoped per view context to ensure uniqueness within each context
 * - Personal contexts get independent numbering from organization contexts
 * 
 * @example
 * // Personal context - user has jobs #1, #2, #5 in their personal space
 * const nextNumber = await this.getNextJobNumber("user_123");
 * // Returns: 6 (highest + 1, regardless of gaps)
 * 
 * // Organization context - org has jobs #1, #2, #3 created by various members
 * const nextOrgNumber = await this.getNextJobNumber("org_456");
 * // Returns: 4 (next in sequence, shared across all org members)
 * 
 * // New view context with no jobs
 * const firstNumber = await this.getNextJobNumber("new_context_id");
 * // Returns: 1
 */

private async getNextJobNumber(userId: string): Promise<number> {
  try {
    const lastJob = await Job.findOne({ userId })
      .sort({ jobNumber: -1 })
      .select('jobNumber')
      .lean() as { jobNumber?: number } | null;
    
    return (lastJob?.jobNumber || 0) + 1;
  } catch (error) {
    console.error('Error getting next job number:', error);
    const jobCount = await Job.countDocuments({ userId });
    return jobCount + 1;
  }
}

async createJob(jobData: Partial<Jobs>, userId: string): Promise<Jobs> {
  try {
    await dbConnect();
    const nextJobNumber = await this.getNextJobNumber(userId);
 
    const job = new Job({
      ...jobData,
      userId,
      jobNumber: nextJobNumber,
      createdDate: new Date()
    });
    const savedJob = await job.save();
    return JSON.parse(JSON.stringify(savedJob));
  } catch (error) {
    throw new Error('Error creating job in database');
  }
}

  async updateJob(id: string, userId: string, updateData: Partial<Jobs>): Promise<Jobs | null> {
    try {
      await dbConnect();
      const updatedJob = await Job.findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedJob ? JSON.parse(JSON.stringify(updatedJob)) : null;
    } catch (error) {
      console.log(error);
      throw new Error('Error updating job in database');
    }
  }

  async deleteJob(id: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const updatedJob = await Job.findOneAndUpdate(
        { _id: id, userId },
        { $set: { isDeleted: true} },
        { new: true, runValidators: true }
      ).lean();
      
      return updatedJob ? JSON.parse(JSON.stringify(updatedJob)) : false;
    } catch (error) {
      throw new Error('Error deleting job from database');
    }
  }

  async getAllUsersWithAssignedJobs(): Promise<string[]> {
    try {
      await dbConnect();
      const users = await Job.distinct('userId');
      return users;
    } catch (error) {
      throw new Error('Error fetching users from database');
    }
  }

  async  setFirstTaskAsNextTaskId(jobId: string) : Promise<Jobs | null> {
    const job = await Job.findById(jobId);
    if (!job || !job.tasks || job.nextTaskId) {
    
      return job;
    }
  
    //clean up deleted tasks from the array
    const nextTaskCandidate = await this.getFirstIncompleteTask(job.tasks);    
    job.nextTaskId = nextTaskCandidate;
    await job.save();
    
    return job ? JSON.parse(JSON.stringify(job)) : null;

  }

  async cleanupDeletedTaskFromJob(jobId: string, taskId: string): Promise<Jobs | null> {
    try {
      await dbConnect();
      const job = await Job.findOne({ _id: jobId });
      if (!job) {
        return null;
      }
      
      const updatedTasks = job.tasks.filter((id: any) => id.toString() !== taskId);
      const nextTaskCandidate = await this.getFirstIncompleteTask(updatedTasks);    

      const updatedJob = await Job.findOneAndUpdate(
        { _id: jobId },
        { $set: { tasks: updatedTasks, nextTaskId: nextTaskCandidate } },
        { new: true, runValidators: true }
      );
      return updatedJob ? JSON.parse(JSON.stringify(updatedJob)) : null;
    } catch (error) {
      console.log('Error cleaning up deleted task from job',error);
      return null;
    }
  }
  
}