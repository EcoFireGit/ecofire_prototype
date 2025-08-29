import Task from "../models/task.model";
import { Task as TaskInterface } from "../models/task.model";
import dbConnect from "../mongodb";
import Job from "../models/job.model"; // Import the Job model
import { calculateTimeElapsed } from "../utils/time-calculator";
import { start } from "repl";
import { RecurrenceInterval } from "../models/task.model";

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

  /**
   * Migrates tasks for filtering by unassigned.
   * Only updates fields if they are currently null or do not exist.
   * This preserves any already-set values.
   * 
   * @description
   * - Connects to the database using dbConnect()
   * - Sets filter fields to "none" or 0 only if missing/null
   * - Logs migration progress to console for monitoring
   * - Runs automatically before fetching tasks to ensure data consistency
   */
  async migrateTaskForFilteringByUnassgined(userId: string): Promise<void> {
    try {
      await dbConnect();
      const unassignedValueForFilters = "none";
      // Find all tasks where at least one field is missing or null
      const tasksToUpdate = await Task.find({
        userId,
        $or: [
          { owner: { $exists: false } },
          { owner: null },
          { focusLevel: { $exists: false } },
          { focusLevel: null },
          { joyLevel: { $exists: false } },
          { joyLevel: null },
          { tags: { $exists: false } },
          { tags: null },
          { requiredHours: { $exists: false } },
          { requiredHours: null }
        ]
      }).lean();

      let count = 0;

      for (const task of tasksToUpdate) {
        const update: any = {};
        // Only set each field if currently missing or null
        if (task.owner === undefined || task.owner === null) {
          update.owner = unassignedValueForFilters;
        }
        if (task.focusLevel === undefined || task.focusLevel === null) {
          update.focusLevel = unassignedValueForFilters;
        }
        if (task.joyLevel === undefined || task.joyLevel === null) {
          update.joyLevel = unassignedValueForFilters;
        }
        if (task.tags === undefined || task.tags === null) {
          update.tags = unassignedValueForFilters;
        }
        if (task.requiredHours === undefined || task.requiredHours === null) {
          update.requiredHours = 0;
        }
        // Only update if there's something to change
        if (Object.keys(update).length > 0) {
          await Task.updateOne({ _id: task._id }, { $set: update });
          count++;
        }
      }
      
      console.log(`Migrated ${count} tasks with correct filter setting for user ${userId}`);

    }
    catch (error) {
      console.error('Error migrating task filter settings:', error);
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
      // Ensure active tasks never have an endDate or timeElapsed

      const sanitizedTasks = tasks.map(task => {
        if (task.completed === false) {
          return { ...task, endDate: null, timeElapsed: null };
        }
        return task;
      });
      return JSON.parse(JSON.stringify(sanitizedTasks));
    } catch (error) {
      throw new Error("Error fetching tasks from database");
    }
  }

  async getTaskById(id: string, userId: string): Promise<TaskInterface | null> {
    try {
      await dbConnect();
    //  await this.migrateTaskForFilteringByUnassgined(userId);

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
      
      // Check if this is a recurring task and if the job is complete
      if (taskData.isRecurring && taskData.jobId) {
        try {
          const job = await Job.findOne({ _id: taskData.jobId });
          if (job && job.isDone) {
            console.log(`Job ${taskData.jobId} is marked as complete, not allowing recurring task creation`);
            // Override the recurring properties to prevent recurring task creation for completed jobs
            taskData.isRecurring = false;
            taskData.recurrenceInterval = undefined;
          }
        } catch (jobError) {
          console.error("Error checking job status for recurring task creation:", jobError);
          // If we can't check the job status, don't allow recurring tasks to be safe
          taskData.isRecurring = false;
          taskData.recurrenceInterval = undefined;
        }
      }
      
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
      await dbConnect();
      const updateData: Partial<TaskInterface> = {
        completed: isCompleted,
      };
      let newRecurringTask = null;
      if (isCompleted) {
        const now = new Date();
        updateData.endDate = now;
        const existingTask = await this.getTaskById(id, userId);
        if (existingTask?.createdDate) {
          try {
            let startDate: Date;
            const createdDate = new Date(existingTask.createdDate);
            if (existingTask.date) {
              const taskDueDate = new Date(existingTask.date);
              if (now >= taskDueDate) {
                startDate = taskDueDate;
              } else {
                startDate = createdDate;
              }
            } else {
              startDate = createdDate;
            }
            const timeElapsed = calculateTimeElapsed(startDate, now);
            updateData.timeElapsed = timeElapsed;
          } catch (timeError) {
            console.error("Error calculating time elapsed:", timeError);
            updateData.timeElapsed = null;
          }
        } else {
          updateData.timeElapsed = null;
        }
        // Recurring task logic
        if (existingTask && existingTask.isRecurring && existingTask.recurrenceInterval) {
          // Check if the job is marked as complete - if so, don't create new recurring instances
          if (existingTask.jobId) {
            try {
              const job = await Job.findOne({ _id: existingTask.jobId });
              if (job && job.isDone) {
                console.log(`Job ${existingTask.jobId} is marked as complete, not creating new recurring task instance`);
                // Set the current task's recurring properties to false since the job is complete
                updateData.isRecurring = false;
                updateData.recurrenceInterval = undefined;
              } else {
                // Job is not complete, proceed with creating new recurring instance
                // Calculate next date
                // Use do-date if set, otherwise use createdDate as the reference
                let lastDate: Date;
                if (existingTask.date) {
                  lastDate = new Date(existingTask.date);
                } else if (existingTask.createdDate) {
                  lastDate = new Date(existingTask.createdDate);
                } else {
                  lastDate = now;
                }
                let nextDate = new Date(lastDate);
                switch (existingTask.recurrenceInterval) {
                  case RecurrenceInterval.Daily:
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                  case RecurrenceInterval.Weekly:
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                  case RecurrenceInterval.Biweekly:
                    nextDate.setDate(nextDate.getDate() + 14);
                    break;
                  case RecurrenceInterval.Monthly:
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                  case RecurrenceInterval.Quarterly:
                    nextDate.setMonth(nextDate.getMonth() + 3);
                    break;
                  case RecurrenceInterval.Annually:
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
                  default:
                    break;
                }
                // Create new task instance
                const newTaskData: Partial<TaskInterface> = {
                  title: existingTask.title,
                  jobId: existingTask.jobId,
                  userId: existingTask.userId,
                  owner: existingTask.owner,
                  requiredHours: existingTask.requiredHours,
                  focusLevel: existingTask.focusLevel,
                  joyLevel: existingTask.joyLevel,
                  notes: existingTask.notes,
                  tags: existingTask.tags,
                  isRecurring: existingTask.isRecurring,
                  recurrenceInterval: existingTask.recurrenceInterval,
                  completed: false,
                  endDate: null,
                  timeElapsed: null,
                  createdDate: new Date(),
                  date: nextDate,
                  isDeleted: false,
                };
                // Actually create the new task
                try {
                  console.log("Creating new recurring task with data:", {
                    title: newTaskData.title,
                    jobId: newTaskData.jobId,
                    date: newTaskData.date,
                    isRecurring: newTaskData.isRecurring,
                    recurrenceInterval: newTaskData.recurrenceInterval
                  });
                  const newTask = await this.createTask(newTaskData, userId);
                  console.log(`Successfully created new recurring task for interval: ${existingTask.recurrenceInterval}`);
                  
                  // Add the new task to the job's tasks array
                  if (newTask && existingTask.jobId) {
                    try {
                      const job = await Job.findOne({ _id: existingTask.jobId });
                      if (job) {
                        const currentTasks = job.tasks || [];
                        if (!currentTasks.includes(newTask._id)) {
                          job.tasks = [...currentTasks, newTask._id];
                          await job.save();
                          console.log(`Added new recurring task ${newTask._id} to job ${existingTask.jobId}`);
                        }
                      }
                    } catch (jobUpdateError) {
                      console.error("Error updating job tasks array:", jobUpdateError);
                      // Don't throw - the task was created successfully
                    }
                  }
                } catch (createError) {
                  console.error("Error creating new recurring task:", createError);
                  // Don't throw the error - just log it so the original task completion still succeeds
                  // The user can manually create the next instance if needed
                }
              }
            } catch (jobError) {
              console.error("Error checking job status for recurring task:", jobError);
              // If we can't check the job status, don't create new recurring instances to be safe
              updateData.isRecurring = false;
              updateData.recurrenceInterval = undefined;
            }
          }
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

  async getNextTasks(userId: string, organizationId?: string | null): Promise<TaskInterface[]> {
    try {
      await dbConnect();
      console.log('=== getNextTasks DEBUG ===');
      console.log('Input - userId:', userId, 'organizationId:', organizationId);
      
      // Find all tasks for this user that are marked as next tasks
      await this.migrateTaskForFilteringByUnassgined(userId);

      let query: any = {
        $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
      };

      if (organizationId) {
        // When in org view, filter by organization context
        query.userId = organizationId;
        console.log('Org view - using organizationId as userId:', organizationId);
      } else {
        // When in personal view, filter by actual user ID
        query.userId = userId;
        console.log('Personal view - using actual userId:', userId);
      }

      console.log('Final query:', JSON.stringify(query));
      
      // Let's also check what tasks exist in the database
      const allTasks = await Task.find({}).limit(5).lean();
      console.log('Sample of all tasks in DB:', allTasks.map(t => ({
        _id: t._id,
        userId: t.userId,
        organizationId: t.organizationId,
        createdByUserId: t.createdByUserId,
        title: t.title?.substring(0, 20) + '...'
      })));

      const tasks = await Task.find(query).lean();
      console.log('Found tasks count:', tasks.length);
      console.log('Sample of found tasks:', tasks.slice(0, 3).map(t => ({
        _id: t._id,
        userId: t.userId,
        organizationId: t.organizationId,
        createdByUserId: t.createdByUserId,
        title: t.title?.substring(0, 20) + '...'
      })));
      console.log('=== END getNextTasks DEBUG ===');
      
      return JSON.parse(JSON.stringify(tasks));
    } catch (error) {
      console.error('getNextTasks error:', error);
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

  async resetMyDayForUser(userId: string): Promise<number> {
    await dbConnect();
    const result = await Task.updateMany(
      { userId, myDay: true },
      { $set: { myDay: false } }
    );
    return result.modifiedCount || 0;
  }

  async debugTaskState(): Promise<void> {
    try {
      await dbConnect();
      console.log('=== DEBUG TASK STATE ===');
      
      // Get all tasks
      const allTasks = await Task.find({}).lean();
      console.log('Total tasks in DB:', allTasks.length);
      
      // Group by userId
      const tasksByUserId = allTasks.reduce((acc, task) => {
        const userId = task.userId;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(task);
        return acc;
      }, {} as Record<string, any[]>);
      
      console.log('Tasks grouped by userId:');
      Object.entries(tasksByUserId).forEach(([userId, tasks]) => {
        console.log(`  userId: ${userId} - ${tasks.length} tasks`);
        console.log(`    Sample tasks:`, tasks.slice(0, 2).map(t => ({
          _id: t._id,
          title: t.title?.substring(0, 20) + '...',
          organizationId: t.organizationId,
          createdByUserId: t.createdByUserId
        })));
      });
      
      // Check for tasks with organizationId
      const tasksWithOrgId = allTasks.filter(t => t.organizationId);
      console.log('Tasks with organizationId:', tasksWithOrgId.length);
      
      // Check for tasks with createdByUserId
      const tasksWithCreatedBy = allTasks.filter(t => t.createdByUserId);
      console.log('Tasks with createdByUserId:', tasksWithCreatedBy.length);
      
      console.log('=== END DEBUG TASK STATE ===');
    } catch (error) {
      console.error('Error in debugTaskState:', error);
    }
  }
}