import Task from "../models/task.model";
import { Task as TaskInterface } from "../models/task.model";
import dbConnect from "../mongodb";
import Job from "../models/job.model"; // Import the Job model

export class TaskService {
  async getTasksByJobId(
    jobId: string,
    userId: string
  ): Promise<TaskInterface[]> {
    try {
      await dbConnect();
      const tasks = await Task.find({
        jobId,
        userId,
        $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
      }).lean();
      return JSON.parse(JSON.stringify(tasks));
    } catch (error) {
      throw new Error("Error fetching tasks from database");
    }
  }

  async getTaskById(id: string, userId: string): Promise<TaskInterface | null> {
    try {
      await dbConnect();
      const task = await Task.findOne({
        _id: id,
        userId,
        $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
      }).lean();
      return task ? JSON.parse(JSON.stringify(task)) : null;
    } catch (error) {
      throw new Error("Error fetching task from database");
    }
  }

  async createTask(
    taskData: Partial<TaskInterface>,
    userId: string
  ): Promise<TaskInterface> {
    try {
      await dbConnect();
      const task = new Task({
        ...taskData,
        userId,
      });
      const savedTask = await task.save();
      return JSON.parse(JSON.stringify(savedTask));
    } catch (error) {
      throw new Error("Error creating task in database");
    }
  }

  async updateTask(
    id: string,
    userId: string,
    updateData: Partial<TaskInterface>
  ): Promise<TaskInterface | null> {
    try {
      await dbConnect();
    // If requiredHours is not set or is null, default it to 0
    if (updateData.requiredHours === undefined || updateData.requiredHours === null) {
      updateData.requiredHours = 0;
    }      
      const updatedTask = await Task.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      return updatedTask ? JSON.parse(JSON.stringify(updatedTask)) : null;
    } catch (error) {
      throw new Error("Error updating task in database");
    }
  }

  async deleteTask(id: string, userId: string): Promise<TaskInterface> {
    try {
      await dbConnect();
      const result = await Task.findOneAndUpdate(
        { _id: id, userId },
        { $set: { isDeleted: true } },
        { new: true, runValidators: true }
      );
      return JSON.parse(JSON.stringify(result)) ;
    } catch (error) {
      throw new Error("Error deleting task from database");
    }
  }

  async deleteTasksByJobId(jobId: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const result = await Task.updateMany(
        { jobId: jobId, userId: userId }, // Criteria for finding tasks
        {
          $set: { isDeleted: true }, // Fields to update
        },
        { new: true, runValidators: true }
      ).lean();
      return JSON.parse(JSON.stringify(result)) ? true : false;
    } catch (error) {
      throw new Error("Error deleting tasks from database");
    }
  }

  async markCompleted(
    id: string,
    userId: string,
    isCompleted: boolean
  ): Promise<TaskInterface | null> {
    try {
      const updateData = {
        completed: isCompleted,
      };
      return this.updateTask(id, userId, updateData);
    } catch (error) {
      throw new Error("Error setting task status");
    }
  }

  async getNextTasks(userId: string): Promise<TaskInterface[]> {
    try {
      await dbConnect();
      // Find all tasks for this user that are marked as next tasks
      const tasks = await Task.find({
        userId,
        $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
      }).lean();
      return JSON.parse(JSON.stringify(tasks));
    } catch (error) {
      throw new Error("Error fetching next tasks from database");
    }
  }
  
  async getAllUsersWithAssignedTasks(): Promise<string[]> {
    try {
      await dbConnect();
      const users = await Task.distinct('userId');
      return users;
    } catch (error) {
      throw new Error('Error fetching users from database');
    }
  }

  //method to update the tasks order in a job
  async updateTasksOrder(
    jobId: string,
    userId: string,
    taskIds: string[]
  ): Promise<boolean> {
    try {
      await dbConnect();
      
      // Find the job
      const job = await Job.findOne({
        _id: jobId,
        userId,
        $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
      });
      
      if (!job) {
        throw new Error("Job not found");
      }
      
      // Update the job with the new tasks order
      job.tasks = taskIds;
      await job.save();
      
      return true;
    } catch (error) {
      console.error("Error updating tasks order:", error);
      throw new Error("Error updating tasks order in database");
    }
  }
}