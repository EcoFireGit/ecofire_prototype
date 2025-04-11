// lib/services/pi.service.ts
import PI from '../models/pi.model';
import { PIs } from '../models/pi.model';
import dbConnect from '../mongodb';

export class PIService {
  async getAllPIs(userId: string): Promise<PIs[]> {
    try {
      await dbConnect();
      const pis = await PI.find({ userId }).lean();
      return JSON.parse(JSON.stringify(pis));
    } catch (error) {
      throw new Error('Error fetching PIs from database');
    }
  }

  async checkNameExists(name: string): Promise<boolean> {
    try {
      await dbConnect();  
      const found = await PI.findOne({ name }).collation({ locale: 'en', strength: 2 }).exec();
      return !!found;
    }catch (error) {  
      console.log(error);
      throw new Error('Error checking name existence in database');
    } 
  }

  async getPIById(id: string, userId: string): Promise<PIs | null> {
    try {
      await dbConnect();
      const pi = await PI.findOne({ _id: id, userId }).lean();
      return pi ? JSON.parse(JSON.stringify(pi)) : null;
    } catch (error) {
      throw new Error('Error fetching PI from database');
    }
  }

  async createPI(piData: Partial<PIs>, userId: string): Promise<PIs> {
    try {
      await dbConnect();
      const pi = new PI({
        ...piData,
        userId
      });
      const savedPI = await pi.save();
      return JSON.parse(JSON.stringify(savedPI));
    } catch (error) {
      throw new Error('Error creating PI in database');
    }
  }

  async updatePI(id: string, userId: string, updateData: Partial<PIs>): Promise<PIs | null> {
    try {
      await dbConnect();
      const updatedPI = await PI.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
     
      return updatedPI ? JSON.parse(JSON.stringify(updatedPI)) : null;
    } catch (error) {
      throw new Error('Error updating PI in database');
    }
  }

  async deletePI(id: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const result = await PI.findOneAndDelete({ _id: id, userId });
      return !!result;
    } catch (error) {
      throw new Error('Error deleting PI from database');
    }
  }
}