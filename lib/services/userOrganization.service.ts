// lib/services/userOrganization.service.ts
import UserOrganization from '@/lib/models/userOrganization.model';
import dbConnect from "../mongodb";

export class UserOrganizationService {
  async getUserOrganizations(userId: string) {
    await dbConnect();
    return await UserOrganization.find({ userId });
  }
  
  async addUserToOrganization(
    userId: string, 
    organizationId: string, 
    role: 'admin' | 'member' = 'member'
  ) {
    await dbConnect();
    
    const existing = await UserOrganization.findOne({ 
      userId, 
      organizationId 
    });
    
    if (existing) {
      if (existing.role !== role) {
        existing.role = role;
        return await existing.save();
      }
      return existing;
    }
    
    const userOrg = new UserOrganization({
      userId,
      organizationId,
      role,
      joinedAt: new Date()
    });
    
    return await userOrg.save();
  }
  
  async removeUserFromOrganization(userId: string, organizationId: string) {
    await dbConnect();
    
    const result = await UserOrganization.findOneAndDelete({
      userId,
      organizationId
    });
    
    return !!result;
  }
  
  async updateUserRole(memberDocId: string, role: 'admin' | 'member') {
    await dbConnect();
    return await UserOrganization.findByIdAndUpdate(
      memberDocId,
      { role },
      { new: true }
    );
  }
  
  async getUsersInOrganization(organizationId: string) {
    await dbConnect();
    return await UserOrganization.find({ organizationId });
  }
  
  async isUserInOrganization(userId: string, organizationId: string) {
    await dbConnect();
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId
    });
    
    return !!userOrg;
  }
  
  async getUserRole(userId: string, organizationId: string) {
    await dbConnect();
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId
    });
    
    return userOrg ? userOrg.role : null;
  }
}

// Helper function to use in auth-utils
export async function getUserOrganizations(userId: string) {
  await dbConnect();
  return await UserOrganization.find({ userId });
}
