import dbConnect from "../mongodb";
import Owner from "../models/owner.model";
import { Owner as OwnerType } from "../models/owner.model";

class OwnerService {
  async getAllOwners(userId: string): Promise<OwnerType[]> {
    try {
      await dbConnect();
      const owners = await Owner.find({ userId }).lean();
      return JSON.parse(JSON.stringify(owners));
    } catch (error) {
      throw new Error("Error fetching owners from database");
    }
  }

  async createOwner(name: string, userId: string, actualUserId?: string): Promise<OwnerType> {
    try {
      await dbConnect();
      const owner = new Owner({
        name,
        userId,
        actualUserId,
      });
      const savedOwner = await owner.save();
      return JSON.parse(JSON.stringify(savedOwner));
    } catch (error) {
      throw new Error("Error creating owner in database");
    }
  }

  async updateOwner(
    id: string,
    name: string,
    assignedUserId: string,
    currentUserId: string,
    actualUserId?: string,
  ): Promise<OwnerType | null> {
    try {
      await dbConnect();
      
      // First check if owner exists and get current state
      let existingOwner = await Owner.findOne({ _id: id, userId: currentUserId }).lean();
      
      // If not found with current userId, try finding by ID only for legacy owners
      if (!existingOwner) {
        existingOwner = await Owner.findOne({ _id: id }).lean();
      }
      
      if (!existingOwner) {
        return null;
      }
      
      // Determine what to update based on whether owner is already linked
      const isLinked = !!existingOwner.actualUserId;
      let updateData: any = { name };
      
      if (isLinked) {
        // If already linked, only update actualUserId
        updateData.actualUserId = actualUserId;
      } else {
        // If not linked, update both userId and actualUserId
        updateData.userId = assignedUserId;
        updateData.actualUserId = actualUserId;
      }
      
      // Update with the determined fields
      const owner = await Owner.findOneAndUpdate(
        { _id: id },
        updateData,
        { new: true },
      ).lean();
     
      if (!owner) {
        return null;
      }
     
      return JSON.parse(JSON.stringify(owner));
    } catch (error) {
      throw new Error("Error updating owner in database");
    }
  }

  async checkNameExists(name: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const found = await Owner.findOne({ name, userId })
        .collation({ locale: "en", strength: 2 })
        .exec();
      return !!found;
    } catch (error) {
      console.log(error);
      throw new Error("Error checking name existence in database");
    }
  }
  async deleteOwner(id: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const owner = await Owner.findOne({ _id: id, userId });

      if (!owner) {
        return false;
      }
     

      const result = await Owner.findOneAndDelete({
        _id: id,
        userId,
      });
     

      return !!result;
    } catch (error) {
      console.log(error);
      throw new Error('Error deleting owner from database');
    }
  }

  async ensureDefaultOwner(
    userId: string,
    email: string
  ): Promise<OwnerType | null> {
    if (!email) {
      return null; // Skip if no email is available
    }
    
    try {
      await dbConnect();
      
      // Extract name from email (everything before @)
      const defaultName = email.split('@')[0];
      
      // Check if any owners exist for this user
      const existingOwners = await Owner.find({ userId }).lean();
      
      // If no owners exist for this user, create the default one
      if (existingOwners.length === 0) {
        const defaultOwner = await this.createOwner(defaultName, userId, userId);
        return defaultOwner;
      }
      
      // If we already have owners, don't create a default one
      // This ensures we only create the default owner when the user has no owners
      return null;
    } catch (error) {
      console.error('Error ensuring default owner:', error);
      return null; // Return null instead of throwing to avoid breaking the main flow
    }
  }
}

export default new OwnerService();

