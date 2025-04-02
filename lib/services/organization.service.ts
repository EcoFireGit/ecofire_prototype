// lib/services/organization.service.ts
import Organization, { Organization as OrganizationType } from '@/lib/models/organization.model';
import UserOrganization from '@/lib/models/userOrganization.model';
import mongoose from 'mongoose';

export class OrganizationService {
  async getOrganizations() {
    return await Organization.find({});
  }
  
  async getOrganizationById(id: string) {
    return await Organization.findById(id);
  }
  
  async getOrganizationsForUser(userId: string) {
    // Find all organization IDs the user belongs to
    const userOrgs = await UserOrganization.find({ userId });
    const orgIds = userOrgs.map(userOrg => userOrg.organizationId);
    
    // Get the actual organizations
    return await Organization.find({ _id: { $in: orgIds } });
  }
  
  async createOrganization(data: Partial<OrganizationType>) {
    const organization = new Organization(data);
    return await organization.save();
  }
  
  async updateOrganization(id: string, userId: string, data: Partial<OrganizationType>) {
    // First check if user has admin access to this organization
    const userOrg = await UserOrganization.findOne({ 
      userId, 
      organizationId: id,
      role: 'admin'
    });
    
    if (!userOrg) return null;
    
    return await Organization.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );
  }
  
  async deleteOrganization(id: string, userId: string) {
    // First check if user has admin access to this organization
    const userOrg = await UserOrganization.findOne({ 
      userId, 
      organizationId: id,
      role: 'admin'
    });
    
    if (!userOrg) return false;
    
    // Delete the organization
    const result = await Organization.findByIdAndDelete(id);
    
    if (result) {
      // Also delete all user-organization mappings
      await UserOrganization.deleteMany({ organizationId: id });
      return true;
    }
    
    return false;
  }
}