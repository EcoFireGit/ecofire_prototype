import UserPreferencesModel from "@/lib/models/user-preferences.model";
import dbConnect from '../mongodb';

export class UserPreferencesService {
  async getUserPreferences(userId: string) {
    await dbConnect();
    
    // Attempt to find existing preferences
    let userPreferences = await UserPreferencesModel.findOne({ userId });
    
    // If no preferences exist yet, create default preferences
    if (!userPreferences) {
      userPreferences = await UserPreferencesModel.create({
        userId,
        enableBackstage: false,
        enableTableView: false
      });
    }
    
    return userPreferences;
  }
  
  async updateUserPreferences(userId: string, updates: Partial<{ enableBackstage: boolean, enableTableView: boolean }>) {
    await dbConnect();
    
    // Find existing or create new preferences
    const userPreferences = await this.getUserPreferences(userId);
    
    // Update with new values
    if (updates.hasOwnProperty('enableBackstage')) {
      userPreferences.enableBackstage = updates.enableBackstage as boolean;
    }
    
    if (updates.hasOwnProperty('enableTableView')) {
      userPreferences.enableTableView = updates.enableTableView as boolean;
    }
    
    // Save and return updated preferences
    await userPreferences.save();
    return userPreferences;
  }
}