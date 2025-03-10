// lib/services/pi.service.ts
import JobPiMapping from '../models/pi-job-mapping.model';
import { JobPiMapping as JobPiMappingType} from '../models/pi-job-mapping.model';
import dbConnect from '../mongodb';

export class MappingService {
  async getAllMappingJP(userId: string): Promise<JobPiMappingType[]> {
    try {
      await dbConnect();
      const MappingJobPi = await JobPiMapping.find({ userId }).lean();
      return JSON.parse(JSON.stringify(MappingJobPi));
    } catch (error) {
      throw new Error('Error fetching MappingJobToPI from database');
    }
  }

  async getMappingById(id: string, userId: string): Promise<JobPiMappingType | null> {
    try {
      await dbConnect();
      const mapping = await JobPiMapping.findOne({ _id: id, userId }).lean();
      return mapping ? JSON.parse(JSON.stringify(mapping)) : null;
    } catch (error) {
      throw new Error('Error fetching MappingJobToPI from database');
    }
  }

  async CreateMapping(mappingData: Partial<JobPiMappingType>, userId: string): Promise<JobPiMappingType> {
    try {
      await dbConnect();
      const MappingData = new JobPiMapping({
        ...mappingData,
        userId
      });
      const SavedMapping = await MappingData.save();
      return JSON.parse(JSON.stringify(SavedMapping));
    } catch (error) {
      throw new Error('Error creating MappingJobToPI in database');
    }
  }

  async updateMappingJP(id: string, userId: string, updateData: Partial<JobPiMappingType>): Promise<JobPiMappingType | null> {
    try {
      await dbConnect();
      const updatedMapping = await JobPiMapping.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
     
      return updatedMapping ? JSON.parse(JSON.stringify(updatedMapping)) : null;
    } catch (error) {
      throw new Error('Error updating MappingJobToPI in database');
    }
  }

  async deleteMappingJP(id: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const result = await JobPiMapping.findOneAndDelete({ _id: id, userId });
      return !!result;
    } catch (error) {
      throw new Error('Error deleting MappingJobToPI from database');
    }
  }
}