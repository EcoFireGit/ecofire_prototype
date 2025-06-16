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
        throw new Error('Job or Tasks not found');
      }

      if(!job.tasks.includes(taskId)){
        throw new Error('TaskId not found in job tasks');
      } 

      if(job.nextTaskId !== taskId){
        return job;
      }
        //find the task from the array that is not comple
        // te and set it as nextTask
      const nextTask = await this.getFirstIncompleteTask(job.tasks);
      const updatedJob = await Job.findOneAndUpdate(
        { _id: jobId },
        { nextTaskId: nextTask }, // Specify the fields to update
        { new: true }  // returns the updated document
      );

      return updatedJob;
    } catch (error) {
      throw new Error('Error setting next TaskId in database');
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
  

async getAllJobs(userId: string): Promise<Jobs[]> {
  try {
    await dbConnect();
    const jobs = await Job.find({ 
      userId, 
      $or: [
        { isDeleted: { $eq: false } },
        { isDeleted: { $exists: false } }
      ] 
    }).lean();
    
    const fallbackDate = new Date('2025-06-16T00:00:00.000Z');
    const jobsWithCreatedDate = jobs.map(job => {
      const hasCreatedDate = job.createdDate !== undefined && job.createdDate !== null;
      
      return {
        ...job,
        createdDate: hasCreatedDate ? job.createdDate : fallbackDate
      };
    });
    
    return JSON.parse(JSON.stringify(jobsWithCreatedDate));
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

    async createJob(jobData: Partial<Jobs>, userId: string): Promise<Jobs> {
      try {
        await dbConnect();
        const job = new Job({
          ...jobData,
          userId,
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