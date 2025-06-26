import Task from "../models/task.model";
import { Task as TaskInterface } from "../models/task.model";
import dbConnect from "../mongodb";
import Job from "../models/job.model"; // Import the Job model
import { calculateTimeElapsed } from "../utils/time-calculator";

export class TaskService {
  /**
   * Migrates tasks that don't have time tracking fields by setting them to fallback values.
   * This function ensures backward compatibility for tasks created before the time tracking
   * fields were implemented, preventing them from showing current timestamps inappropriately.
   * 
   * @description
   * - Connects to the database using dbConnect()
   * - Sets fallback date to 2025-05-11 as a meaningful reference point
   * - Finds all tasks for the specified user that either:
   *   - Don't have a createdDate field (field doesn't exist)
   *   - Have a null createdDate value
   * - Updates all matching tasks with the fallback date and null time tracking values
   * - Logs migration progress to console for monitoring
   * - Runs automatically before fetching tasks to ensure data consistency
   * 
   * @example
   * // Called automatically in getTasksByJobId before returning task data
   * await this.migrateTasksForTimeTracking(userId);
   */
  async migrateTasksForTimeTracking(userId: string): Promise<void> {
    try {
      await dbConnect();
      
      const fallbackDate = new Date('2025-05-11T00:00:00.000Z');
      
      const result = await Task.updateMany(
        { 
          userId,
          $or: [
            { createdDate: { $exists: false } },
            { createdDate: null }
          ]
        },
        { 
          $set: { 
            createdDate: fallbackDate,
            endDate: null,
            timeElapsed: null
          }
        }
      );
      
      console.log(`Migrated ${result.modifiedCount} tasks with time tracking fields for user ${userId}`);
    } catch (error) {
      console.error('Error migrating task time tracking:', error);
      throw error;
    }
  }

  async getTasksByJobId(
    jobId: string,
    userId: string
  ): Promise<TaskInterface[]> {
    try {
      await dbConnect();
      await this.migrateTasksForTimeTracking(userId);
      
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
        createdDate: new Date(),
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
    // if (updateData.requiredHours === undefined || updateData.requiredHours === null) {
    //   updateData.requiredHours = 0;
    // }      
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
      const updateData: Partial<TaskInterface> = {
        completed: isCompleted,
      };

      if (isCompleted) {
        const now = new Date();
        updateData.endDate = now;

        const existingTask = await this.getTaskById(id, userId);
        
        if (existingTask?.createdDate) {
          try {
            const timeElapsed = calculateTimeElapsed(existingTask.createdDate, now);
            updateData.timeElapsed = timeElapsed;
          } catch (timeError) {
            console.error("Error calculating time elapsed:", timeError);
            updateData.timeElapsed = null;
          }
        } else {
          console.log("No created date found, skipping time calculation");
        }
      } else {
        updateData.endDate = null;
        updateData.timeElapsed = null;
      }
      
      const result = await this.updateTask(id, userId, updateData);
      
      return result;
    } catch (error) {
        console.error("=== markCompleted ERROR ===");
        console.error("Error details:", error);
        
        const err = error as Error;
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        
        throw new Error("Error setting task status: " + err.message);
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