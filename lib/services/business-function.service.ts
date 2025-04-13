import BusinessFunction from '../models/business-function.model';
import { BusinessFunction as BusinessFunctionType } from '../models/business-function.model';
import dbConnect from '../mongodb';
import DefaultsTracker from '../models/business-funtions-defaults-tracker.model';

export class BusinessFunctionService {
  private defaultFunctions = [
    "Marketing",
    "Design",
    "Engineering",
    "Finance",
    "Sales"
  ];

  async checkNameExists(name: string): Promise<boolean> {
    try {
      await dbConnect();  
      const found = await BusinessFunction.findOne({ name }).collation({ locale: 'en', strength: 2 }).exec();
      return !!found;
    }catch (error) {  
      console.log(error);
      throw new Error('Error checking business function name database');
    } 
  }
  // Track if defaults have been initialized for a user
  // Create a separate collection to track initialization status
  private async hasInitializedDefaults(userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const tracker = await DefaultsTracker.findOne({ userId });
      return !!tracker;
    } catch (error) {
      console.error('Error checking default initialization status:', error);
      return false;
    }
  }

  async initializeDefaultFunctions(userId: string): Promise<void> {
    try {
      await dbConnect();
      
      // We already checked initialization status in getAllBusinessFunctions
      const defaultFunctions = this.defaultFunctions.map(name => ({
        name,
        userId,
        isDefault: true
      }));
      
      await BusinessFunction.insertMany(defaultFunctions);
      
      // Mark that we've initialized defaults for this user
      await DefaultsTracker.findOneAndUpdate(
        { userId },
        { initialized: true },
        { upsert: true }
      );
    } catch (error) {
      throw new Error('Error initializing default business functions');
    }
  }

  async getAllBusinessFunctions(userId: string): Promise<BusinessFunctionType[]> {
    try {
      await dbConnect();
      
      // Only initialize defaults on the very first call for this user
      // when there are no existing functions
      const existingFunctions = await BusinessFunction.countDocuments({ userId });
      if (existingFunctions === 0) {
        const initialized = await this.hasInitializedDefaults(userId);
        if (!initialized) {
          await this.initializeDefaultFunctions(userId);
        }
      }
      
      const functions = await BusinessFunction.find({ userId }).lean();
      return JSON.parse(JSON.stringify(functions));
    } catch (error) {
      throw new Error('Error fetching business functions from database');
    }
  }

  async createBusinessFunction(
    name: string,
    userId: string
  ): Promise<BusinessFunctionType> {
    try {
      await dbConnect();
      const businessFunction = new BusinessFunction({
        name,
        userId,
        isDefault: false
      });
      const savedFunction = await businessFunction.save();
      return JSON.parse(JSON.stringify(savedFunction));
    } catch (error) {
      throw new Error('Error creating business function in database');
    }
  }

  async updateBusinessFunction(
    id: string,
    name: string,
    userId: string
  ): Promise<BusinessFunctionType | null> {
    try {
      await dbConnect();
      const businessFunction = await BusinessFunction.findOneAndUpdate(
        { _id: id, userId },
        { name },
        { new: true }
      ).lean();
      
      if (!businessFunction) {
        return null;
      }
      
      return JSON.parse(JSON.stringify(businessFunction));
    } catch (error) {
      throw new Error('Error updating business function in database');
    }
  }

  async deleteBusinessFunction(
    id: string,
    userId: string
  ): Promise<boolean> {
    try {
      await dbConnect();
      const businessFunction = await BusinessFunction.findOne({ _id: id, userId });
      
      if (!businessFunction) {
        return false;
      }
      
      const result = await BusinessFunction.findOneAndDelete({
        _id: id,
        userId
      });
      
      return !!result;
    } catch (error) {
      throw new Error('Error deleting business function from database');
    }
  }
}