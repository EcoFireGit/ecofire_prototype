// lib/services/organization.service.ts
import Organization, {
  Organization as OrganizationType,
} from "@/lib/models/organization.model";
import UserOrganization from "@/lib/models/userOrganization.model";
import dbConnect from "../mongodb";

export class OrganizationService {
  async getOrganizationById(id: string) {
    await dbConnect();
    return await Organization.findOne({ _id: id, isDeleted: { $ne: true } });
  }

  async getOrganizationsForUser(userId: string) {
    await dbConnect();
    const userOrgs = await UserOrganization.find({ userId });
    const orgIds = userOrgs.map((userOrg) => userOrg.organizationId);
    return await Organization.find({
      _id: { $in: orgIds },
      isDeleted: { $ne: true },
    });
  }

  async createOrganization(data: Partial<OrganizationType>) {
    await dbConnect();
    const organization = new Organization(data);
    return await organization.save();
  }

  async updateOrganization(
    id: string,
    userId: string,
    data: Partial<OrganizationType>,
  ) {
    await dbConnect();
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId: id,
      role: "admin",
    });

    if (!userOrg) return null;

    return await Organization.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true },
    );
  }

  async deleteOrganization(id: string, userId: string) {
    await dbConnect();
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId: id,
      role: "admin",
    });

    if (!userOrg) return false;

    const result = await Organization.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (result) {
      await UserOrganization.deleteMany({ organizationId: id });
      return true;
    }

    return false;
  }
}
