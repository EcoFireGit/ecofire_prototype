
import BusinessInfo from '../models/business-info.model';
import { BusinessInfo as BusinessInfoType } from '../models/business-info.model';
import dbConnect from '../mongodb';

export class BusinessInfoService {
  async getBusinessInfo(userId: string): Promise<BusinessInfoType | null> {
    try {
      await dbConnect();
      const businessInfo = await BusinessInfo.findOne({ userId }).lean();
      return businessInfo ? JSON.parse(JSON.stringify(businessInfo)) : null;
    } catch (error) {
      throw new Error('Error fetching businessInfo from database');
    }
  }

  async updateBusinessInfo(
    userId: string,
    data: Partial<BusinessInfoType>
  ): Promise<BusinessInfoType> {
    try {
      await dbConnect();
      const businessInfo = await BusinessInfo.findOneAndUpdate(
        { userId },
        { ...data, userId },
        { new: true, upsert: true }
      ).lean();
      
      return JSON.parse(JSON.stringify(businessInfo));
    } catch (error) {
      throw new Error('Error updating businessInfo in database');
    }
  }
}
