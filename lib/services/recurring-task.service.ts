// lib/services/recurring-task.service.ts
import Task from "../models/task.model";
import Job from "../models/job.model";
import { Task as TaskInterface, RecurrencePattern, RecurrenceEndType, CustomRecurrenceUnit } from "../models/task.model";
import dbConnect from "../mongodb";
import { JobService } from "./job.service";
import { TaskService } from "./task.service";

export class RecurringTaskService {
  private jobService = new JobService();
  private taskService = new TaskService();

  /**
   * Main method to process all recurring tasks that need to be created
   */
  async processRecurringTasks(): Promise<void> {
    try {
      await dbConnect();
      console.log(`[${new Date().toISOString()}] Starting recurring task processing...`);

      // Get tomorrow's date at midnight UTC
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      // Find all recurring tasks that should be created tomorrow
      const tasksToProcess = await this.getRecurringTasksForDate(tomorrow);
      
      console.log(`Found ${tasksToProcess.length} recurring tasks to process for ${tomorrow.toISOString()}`);

      let successCount = 0;
      let errorCount = 0;

      for (const task of tasksToProcess) {
        try {
          await this.createRecurringTaskInstance(task, tomorrow);
          successCount++;
        } catch (error) {
          console.error(`Error creating recurring task instance for task ${task._id}:`, error);
          errorCount++;
        }
      }

      console.log(`Recurring task processing completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error("Error in processRecurringTasks:", error);
      throw error;
    }
  }

  /**
   * Get all recurring tasks that should be created for a specific date
   */
  private async getRecurringTasksForDate(targetDate: Date): Promise<TaskInterface[]> {
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const tasks = await Task.find({
      isRecurring: true,
      isDeleted: false,
      nextRecurringDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).lean();

    return JSON.parse(JSON.stringify(tasks));
  }

  /**
   * Create a new instance of a recurring task
   */
  private async createRecurringTaskInstance(parentTask: TaskInterface, scheduledDate: Date): Promise<void> {
    // First, check if the job is still active
    const job = await Job.findById(parentTask.jobId);
    if (!job || job.isDeleted || job.isDone) {
      console.log(`Skipping recurring task ${parentTask._id} - job ${parentTask.jobId} is completed or deleted`);
      return;
    }

    // Check if we've reached the end condition
    if (await this.hasReachedEndCondition(parentTask)) {
      console.log(`Recurring task ${parentTask._id} has reached its end condition`);
      // Mark the parent task as no longer recurring
      await Task.findByIdAndUpdate(parentTask._id, {
        isRecurring: false,
        nextRecurringDate: null
      });
      return;
    }

    // Create the new task instance
    const newTaskData: Partial<TaskInterface> = {
      title: parentTask.title,
      owner: parentTask.owner,
      date: scheduledDate,
      requiredHours: parentTask.requiredHours,
      focusLevel: parentTask.focusLevel,
      joyLevel: parentTask.joyLevel,
      notes: parentTask.notes,
      tags: parentTask.tags ? [...parentTask.tags] : [],
      jobId: parentTask.jobId,
      userId: parentTask.userId,
      completed: false,
      isDeleted: false,
      isRecurring: false, // The instance itself is not recurring
      parentRecurringTaskId: parentTask._id
    };

    // Create the new task
    const newTask = await this.taskService.createTask(newTaskData, parentTask.userId);

    // Add the new task to the job's task array
    await this.addTaskToJob(parentTask.jobId, newTask._id);

    // Update the parent task's recurrence data
    await this.updateParentTaskRecurrence(parentTask);

    console.log(`Created recurring task instance ${newTask._id} for parent ${parentTask._id}`);
  }

  /**
   * Check if a recurring task has reached its end condition
   */
  private async hasReachedEndCondition(task: TaskInterface): Promise<boolean> {
    if (!task.recurrenceEndType || task.recurrenceEndType === RecurrenceEndType.Never) {
      return false;
    }

    if (task.recurrenceEndType === RecurrenceEndType.OnDate && task.recurrenceEndDate) {
      const endDate = new Date(task.recurrenceEndDate);
      const nextDate = new Date(task.nextRecurringDate!);
      return nextDate > endDate;
    }

    if (task.recurrenceEndType === RecurrenceEndType.AfterOccurrences && task.recurrenceMaxOccurrences) {
      const currentCount = task.recurrenceCurrentCount || 0;
      return currentCount >= task.recurrenceMaxOccurrences;
    }

    return false;
  }

  /**
   * Add a task to a job's task array and potentially set as next task
   */
  private async addTaskToJob(jobId: string, taskId: string): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    // Add task to job's task array if not already there
    if (!job.tasks.includes(taskId)) {
      job.tasks.push(taskId);
    }

    // If there's no current next task, set this as the next task
    if (!job.nextTaskId) {
      job.nextTaskId = taskId;
    }

    await job.save();
  }

  /**
   * Update the parent recurring task's next occurrence date and counter
   */
  private async updateParentTaskRecurrence(parentTask: TaskInterface): Promise<void> {
    const nextDate = this.calculateNextOccurrence(parentTask);
    const currentCount = (parentTask.recurrenceCurrentCount || 0) + 1;

    await Task.findByIdAndUpdate(parentTask._id, {
      nextRecurringDate: nextDate,
      recurrenceCurrentCount: currentCount
    });
  }

  /**
   * Calculate the next occurrence date based on recurrence pattern
   */
  private calculateNextOccurrence(task: TaskInterface): Date | null {
    if (!task.nextRecurringDate || !task.recurrencePattern) {
      return null;
    }

    const currentDate = new Date(task.nextRecurringDate);
    const nextDate = new Date(currentDate);

    switch (task.recurrencePattern) {
      case RecurrencePattern.Daily:
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        break;

      case RecurrencePattern.Weekly:
        nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        break;

      case RecurrencePattern.Biweekly:
        nextDate.setUTCDate(nextDate.getUTCDate() + 14);
        break;

      case RecurrencePattern.Monthly:
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        break;

      case RecurrencePattern.Annually:
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
        break;

      case RecurrencePattern.Custom:
        if (task.customRecurrenceInterval && task.customRecurrenceUnit) {
          this.addCustomInterval(nextDate, task.customRecurrenceInterval, task.customRecurrenceUnit);
        }
        break;

      default:
        return null;
    }

    return nextDate;
  }

  /**
   * Add custom interval to a date
   */
  private addCustomInterval(date: Date, interval: number, unit: CustomRecurrenceUnit): void {
    switch (unit) {
      case CustomRecurrenceUnit.Days:
        date.setUTCDate(date.getUTCDate() + interval);
        break;
      case CustomRecurrenceUnit.Weeks:
        date.setUTCDate(date.getUTCDate() + (interval * 7));
        break;
      case CustomRecurrenceUnit.Months:
        date.setUTCMonth(date.getUTCMonth() + interval);
        break;
      case CustomRecurrenceUnit.Years:
        date.setUTCFullYear(date.getUTCFullYear() + interval);
        break;
    }
  }

  /**
   * Set up initial recurring task (called when a recurring task is first created)
   */
  async setupRecurringTask(taskId: string): Promise<void> {
    try {
      await dbConnect();
      const task = await Task.findById(taskId);
      
      if (!task || !task.isRecurring) {
        return;
      }

      // Calculate the first next occurrence
      const nextDate = this.calculateNextOccurrence({
        ...task.toObject(),
        nextRecurringDate: task.date || new Date()
      });

      if (nextDate) {
        await Task.findByIdAndUpdate(taskId, {
          nextRecurringDate: nextDate,
          recurrenceCurrentCount: 0
        });
      }
    } catch (error) {
      console.error(`Error setting up recurring task ${taskId}:`, error);
      throw error;
    }
  }
}