import Task from '../models/task.model';
import { Task as TaskInterface } from '../models/task.model';
import dbConnect from '../mongodb';

export class TaskService {
  async getTasksByJobId(jobId: string, userId: string): Promise<TaskInterface[]> {
    try {
      await dbConnect();
      const tasks = await Task.find({ jobId, userId }).lean();
      return JSON.parse(JSON.stringify(tasks));
    } catch (error) {
      throw new Error('Error fetching tasks from database');
    }
  }

  async getTaskById(id: string, userId: string): Promise<TaskInterface | null> {
    try {
      await dbConnect();
      const task = await Task.findOne({ _id: id, userId }).lean();
      return task ? JSON.parse(JSON.stringify(task)) : null;
    } catch (error) {
      throw new Error('Error fetching task from database');
    }
  }

  async createTask(taskData: Partial<TaskInterface>, userId: string): Promise<TaskInterface> {
    try {
      await dbConnect();
      const task = new Task({
        ...taskData,
        userId
      });
      const savedTask = await task.save();
      return JSON.parse(JSON.stringify(savedTask));
    } catch (error) {
      throw new Error('Error creating task in database');
    }
  }

  async updateTask(id: string, userId: string, updateData: Partial<TaskInterface>): Promise<TaskInterface | null> {
    try {
      await dbConnect();
      const updatedTask = await Task.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
     
      return updatedTask ? JSON.parse(JSON.stringify(updatedTask)) : null;
    } catch (error) {
      throw new Error('Error updating task in database');
    }
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const result = await Task.findOneAndDelete({ _id: id, userId });
      return !!result;
    } catch (error) {
      throw new Error('Error deleting task from database');
    }
  }

  async getNextTasks(userId: string): Promise<TaskInterface[]> {
  try {
    await dbConnect();
    // Find all tasks for this user that are marked as next tasks
    const tasks = await Task.find({ 
      userId, 
    }).lean();
    console.log(tasks);
    return JSON.parse(JSON.stringify(tasks));
  } catch (error) {
    throw new Error('Error fetching next tasks from database');
  }
}
}