import Task  from '../models/task.model';
import Job from '../models/job.model';
import { Jobs } from '../models/job.model';
import dbConnect from '../mongodb';

export class JobService {
  async setIncompleteTaskAsNextStep(jobId: string): Promise<Jobs | null> {
    try {
      await dbConnect();
      const job = await Job.findById(jobId);
      const tasks = job.tasks as string[];

        //find the task from the array that is not complete and set it as nextTask
      const nextTask = await this.getFirstIncompleteTask(tasks);
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

      if (foundTask && foundTask.completed === false) {
        return foundTask.id; // Return the ID of the first incomplete task
      }

    }
    return null;

  }
  

  async getAllJobs(userId: string): Promise<Jobs[]> {
    try {
      await dbConnect();
      const jobs = await Job.find({ userId, $or: [
        { isDeleted: { $eq: false } },
        { isDeleted: { $exists: false } }
      ] }).lean();
      return JSON.parse(JSON.stringify(jobs));
    } catch (error) {
      throw new Error('Error fetching jobs from database');
    }
  }

  async getJobById(id: string, userId: string): Promise<Jobs | null> {
    try {
      await dbConnect();
      const job = await Job.findOne({ _id: id, userId, isDeleted: false }).lean();
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
        userId
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
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      //find the task from the array that is not complete and set it as nextTask
      const tasks = updateData.tasks as string[];
      const nextTask = await this.getFirstIncompleteTask(tasks);
      const updatedJobWithNextTask = await this.setIncompleteTaskAsNextStep(id);
       
      return updatedJobWithNextTask ? JSON.parse(JSON.stringify(updatedJobWithNextTask)) : null;
    } catch (error) {
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
  
}