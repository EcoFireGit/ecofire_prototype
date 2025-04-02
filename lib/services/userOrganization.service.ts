// lib/services/userOrganization.service.ts
import UserOrganization from '@/lib/models/userOrganization.model';
import mongoose from 'mongoose';

export class UserOrganizationService {
  async getUserOrganizations(userId: string) {
    return await UserOrganization.find({ userId });
  }
  
  async addUserToOrganization(
    userId: string, 
    organizationId: string, 
    role: 'admin' | 'member' = 'member'
  ) {
    // Check if mapping already exists
    const existing = await UserOrganization.findOne({ 
      userId, 
      organizationId 
    });
    
    if (existing) {
      // Update role if different
      if (existing.role !== role) {
        existing.role = role;
        return await existing.save();
      }
      return existing;
    }
    
    // Create new mapping
    const userOrg = new UserOrganization({
      userId,
      organizationId,
      role,
      joinedAt: new Date()
    });
    
    return await userOrg.save();
  }
  
  async removeUserFromOrganization(userId: string, organizationId: string) {
    const result = await UserOrganization.findOneAndDelete({
      userId,
      organizationId
    });
    
    return !!result;
  }
  
  async updateUserRole(
    userId: string, 
    organizationId: string, 
    role: 'admin' | 'member'
  ) {
    return await UserOrganization.findOneAndUpdate(
      { userId, organizationId },
      { role },
      { new: true }
    );
  }
  
  async getUsersInOrganization(organizationId: string) {
    return await UserOrganization.find({ organizationId });
  }
  
  async isUserInOrganization(userId: string, organizationId: string) {
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId
    });
    
    return !!userOrg;
  }
  
  async getUserRole(userId: string, organizationId: string) {
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId
    });
    
    return userOrg ? userOrg.role : null;
  }
}

// Helper function to use in auth-utils
export async function getUserOrganizations(userId: string) {
  return await UserOrganization.find({ userId });
}