// lib/services/task-progress.service.ts

import { TaskService } from './task.service';
import Task from "../models/task.model";
import dbConnect from "../mongodb";

export class TaskProgressService {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  /**
   * Get completed task count for a job
   * @param jobId The ID of the job
   * @param userId The ID of the user 
   * @returns Object with total and completed task counts
   */
  async getTaskCounts(jobId: string, userId: string): Promise<{ total: number; completed: number }> {
    try {
      // Get all tasks for the job
      const tasks = await this.taskService.getTasksByJobId(jobId, userId);
      
      if (!tasks || tasks.length === 0) {
        return { total: 0, completed: 0 };
      }

      // Count completed tasks
      const completedCount = tasks.filter(task => task.completed).length;
      
      return {
        total: tasks.length,
        completed: completedCount
      };
    } catch (error) {
      console.error('Error getting task counts:', error);
      return { total: 0, completed: 0 };
    }
  }

  /**
   * Get task counts for multiple jobs in a single database query
   * @param jobIds Array of job IDs
   * @param userId User ID
   * @returns Object mapping job IDs to their task counts
   */
  async getMultipleJobsTaskCounts(
    jobIds: string[], 
    userId: string
  ): Promise<Record<string, { total: number; completed: number }>> {
    try {
      await dbConnect();
      
      // Create a map to store results
      const taskCountsMap: Record<string, { total: number; completed: number }> = {};
      
      // Initialize all jobs with zero counts
      jobIds.forEach(jobId => {
        taskCountsMap[jobId] = { total: 0, completed: 0 };
      });

      // Get all tasks for all jobs in a single query
      const tasks = await Task.find({
        jobId: { $in: jobIds },
        userId,
        $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
      }).lean();
      
      // Process the tasks
      if (tasks && tasks.length > 0) {
        tasks.forEach(task => {
          const jobId = task.jobId.toString();
          
          // Increment total count
          taskCountsMap[jobId].total += 1;
          
          // Increment completed count if task is completed
          if (task.completed) {
            taskCountsMap[jobId].completed += 1;
          }
        });
      }
      
      return taskCountsMap;
    } catch (error) {
      console.error('Error getting multiple jobs task counts:', error);
      return {};
    }
  }
}