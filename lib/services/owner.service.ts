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

  async createOwner(name: string, userId: string): Promise<OwnerType> {
    try {
      await dbConnect();
      const owner = new Owner({
        name,
        userId,
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
    userId: string,
  ): Promise<OwnerType | null> {
    try {
      await dbConnect();
      const owner = await Owner.findOneAndUpdate(
        { _id: id, userId },
        { name },
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
      throw new Error("Error deleting owner from database");
    }
  }
}

export default new OwnerService();

