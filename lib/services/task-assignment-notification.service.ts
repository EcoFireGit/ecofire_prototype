import { NotificationService } from "./notification.service";
import OwnerService from "./owner.service";
import dbConnect from "../mongodb";
import { cookies } from "next/headers";

export class TaskAssignmentNotificationService {
  private notificationService = new NotificationService();

  private async getActiveOrganizationId(): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      const activeOrgCookie = cookieStore.get('ecofire_active_org');
      
      if (activeOrgCookie) {
        return JSON.parse(activeOrgCookie.value);
      }
      return null;
    } catch (error) {
      console.error("Error getting active organization:", error);
      return null;
    }
  }

  private async getOwnersInOrganization(organizationId: string): Promise<any[]> {
    try {
      // Get all users in the organization
      const UserOrganization = (await import("../models/userOrganization.model")).default;
      const userOrgs = await UserOrganization.find({ organizationId }).lean();
      const userIds = userOrgs.map(uo => uo.userId);
      
      // Get all owners for all users in the organization
      const Owner = (await import("../models/owner.model")).default;
      const owners = await Owner.find({ userId: { $in: userIds } }).lean();
      
      return owners;
    } catch (error) {
      console.error("Error getting owners in organization:", error);
      return [];
    }
  }

  async createNotificationForTaskAssignment(
    taskId: string,
    taskTitle: string,
    ownerId: string,
    assignedByUserId: string,
  ): Promise<void> {
    try {
      await dbConnect();

      // Get the active organization
      const organizationId = await this.getActiveOrganizationId();
      if (!organizationId) {
        console.log("No active organization found");
        return;
      }

      // Get all owners in the organization
      const organizationOwners = await this.getOwnersInOrganization(organizationId);
      const targetOwner = organizationOwners.find(o => o._id === ownerId);

      if (!targetOwner) {
        console.log(`Owner ${ownerId} not found in organization ${organizationId}`);
        return;
      }

      // Create notification for the assigned user
      await this.notificationService.createTaskAssignmentNotification(
        targetOwner.userId,
        taskId,
        taskTitle,
        assignedByUserId,
      );

      console.log(`Created task assignment notification for user ${targetOwner.userId}`);
    } catch (error) {
      console.error("Error creating task assignment notification:", error);
      // Don't throw error to avoid breaking the main task creation flow
    }
  }

  async createNotificationForTaskUpdate(
    taskId: string,
    taskTitle: string,
    oldOwnerId: string | null,
    newOwnerId: string | null,
    updatedByUserId: string,
  ): Promise<void> {
    try {
      await dbConnect();

      // If owner didn't change, no notification needed
      if (oldOwnerId === newOwnerId) {
        return;
      }

      // Get the active organization
      const organizationId = await this.getActiveOrganizationId();
      if (!organizationId) {
        console.log("No active organization found");
        return;
      }

      // Get all owners in the organization
      const organizationOwners = await this.getOwnersInOrganization(organizationId);

      // Remove notification for old owner if exists
      if (oldOwnerId) {
        const targetOldOwner = organizationOwners.find(o => o._id === oldOwnerId);
        if (targetOldOwner) {
          // Note: We could implement a method to remove specific task notifications
          // For now, we'll just create a new notification for the new owner
        }
      }

      // Create notification for new owner
      if (newOwnerId) {
        await this.createNotificationForTaskAssignment(
          taskId,
          taskTitle,
          newOwnerId,
          updatedByUserId,
        );
      }
    } catch (error) {
      console.error("Error creating task update notification:", error);
      // Don't throw error to avoid breaking the main task update flow
    }
  }
}

export default new TaskAssignmentNotificationService();
