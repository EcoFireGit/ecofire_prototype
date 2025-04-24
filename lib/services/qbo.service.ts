// lib/services/qbo.service.ts
import QBO from '../models/qbo.model';
import { QBOs } from '../models/qbo.model';
import dbConnect from '../mongodb';

export class QBOService {
  async getAllQBOs(userId: string): Promise<QBOs[]> {
    try {
      await dbConnect();
      const qbos = await QBO.find({ userId }).lean();
      return JSON.parse(JSON.stringify(qbos));
    } catch (error) {
      throw new Error('Error fetching QBOs from database');
    }
  }

  async checkNameExists(name: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();  
      const found = await QBO.findOne({ name, userId  }).collation({ locale: 'en', strength: 2 }).exec();
      return !!found;
    }catch (error) {  
      console.log(error);
      throw new Error('Error checking name existence in database');
    } 
  }

  async getQBOById(id: string, userId: string): Promise<QBOs | null> {
    try {
      await dbConnect();
      const qbo = await QBO.findOne({ _id: id, userId }).lean();
      return qbo ? JSON.parse(JSON.stringify(qbo)) : null;
    } catch (error) {
      throw new Error('Error fetching QBO from database');
    }
  }

  async createQBO(qboData: Partial<QBOs>, userId: string): Promise<QBOs> {
    try {
      await dbConnect();
      const qbo = new QBO({
        ...qboData,
        userId
      });
      const savedQBO = await qbo.save();
      return JSON.parse(JSON.stringify(savedQBO));
    } catch (error) {
      console.error('QBO creation error details:', error);
      throw new Error(`Error creating QBO in database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateQBO(id: string, userId: string, updateData: Partial<QBOs>): Promise<QBOs | null> {
    try {
      await dbConnect();
      const updatedQBO = await QBO.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
     
      return updatedQBO ? JSON.parse(JSON.stringify(updatedQBO)) : null;
    } catch (error) {
      throw new Error('Error updating QBO in database');
    }
  }

  async deleteQBO(id: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const result = await QBO.findOneAndDelete({ _id: id, userId });
      return !!result;
    } catch (error) {
      throw new Error('Error deleting QBO from database');
    }
  }
}