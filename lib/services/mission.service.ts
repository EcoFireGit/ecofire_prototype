
import dbConnect from "../mongodb";
import { Mission } from "../models/mission.model";

export class MissionService {
  // Get the mission statement
  async getMission() {
    try {
      await dbConnect();
      // Since we only have one mission statement, get the first one
      const mission = await Mission.findOne().sort({ updatedAt: -1 }).lean();
      return mission;
    } catch (error) {
      console.error("Error fetching mission statement:", error);
      throw error;
    }
  }

  // Update or create the mission statement
  async updateMission(statement: string) {
    try {
      await dbConnect();
      
      // Find the existing mission statement
      const existingMission = await Mission.findOne();
      
      if (existingMission) {
        // Update existing mission statement
        existingMission.statement = statement;
        existingMission.updatedAt = new Date();
        await existingMission.save();
        return existingMission;
      } else {
        // Create new mission statement if none exists
        const newMission = new Mission({
          statement,
          updatedAt: new Date()
        });
        await newMission.save();
        return newMission;
      }
    } catch (error) {
      console.error("Error updating mission statement:", error);
      throw error;
    }
  }
}
