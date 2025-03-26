// lib/services/task-progress.service.ts

import { TaskService } from './task.service';

export class TaskProgressService {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  /**
   * Calculate the completion percentage for a job based on completed tasks
   * @param jobId The ID of the job
   * @param userId The ID of the user
   * @returns A number between 0 and 100 representing the completion percentage
   */
  async calculateJobProgress(jobId: string, userId: string): Promise<number> {
    try {
      // Get all tasks for the job
      const tasks = await this.taskService.getTasksByJobId(jobId, userId);
      
      // If there are no tasks, return 0% progress
      if (!tasks || tasks.length === 0) {
        return 0;
      }

      // Count completed tasks
      const completedTasks = tasks.filter(task => task.completed).length;
      
      // Calculate percentage
      const progressPercentage = Math.round((completedTasks / tasks.length) * 100);
      
      return progressPercentage;
    } catch (error) {
      console.error('Error calculating job progress:', error);
      return 0; // Return 0 in case of error
    }
  }

  /**
   * Calculate completion percentages for multiple jobs at once
   * @param jobIds Array of job IDs
   * @param userId User ID
   * @returns Object mapping job IDs to their completion percentages
   */
  async calculateMultipleJobsProgress(jobIds: string[], userId: string): Promise<Record<string, number>> {
    try {
      // Create an object to store the results
      const progressMap: Record<string, number> = {};
      
      // Process all jobs in parallel
      const progressPromises = jobIds.map(async (jobId) => {
        const progress = await this.calculateJobProgress(jobId, userId);
        progressMap[jobId] = progress;
      });
      
      await Promise.all(progressPromises);
      
      return progressMap;
    } catch (error) {
      console.error('Error calculating multiple job progress:', error);
      return {}; // Return empty object in case of error
    }
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
}