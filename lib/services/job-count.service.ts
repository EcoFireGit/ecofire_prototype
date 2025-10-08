import Job from '../models/job.model';
import dbConnect from '../mongodb';

export class JobCountService {
  async getJobCountsByBusinessFunction(userId: string): Promise<Record<string, number>> {
    try {
      await dbConnect();
      
      const jobCounts = await Job.aggregate([
        { 
          $match: { 
            userId,
            isDone: { $ne: true },
            isDeleted: { $ne: true }
          } 
        },
        { $group: { _id: "$businessFunctionId", count: { $sum: 1 } } }
      ]);
      
      const countMap: Record<string, number> = {};
      
      jobCounts.forEach((item) => {
        const businessFunctionId = item._id || 'uncategorized';
        countMap[businessFunctionId] = item.count;
      });
      
      return countMap;
    } catch (error) {
      console.error('Error getting job counts:', error);
      return {};
    }
  }
}
