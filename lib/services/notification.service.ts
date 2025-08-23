import Notification from "../models/notification.model";
import dbConnect from "../mongodb";

export class NotificationService {
  async getFirstUnseenNotificationsAfterCurrentTimeForUser(
    userId: string,
    currentTimeISO: Date,
  ): Promise<Notification> {
    try {
      await dbConnect();

      const notifications = await Notification.find({
        userId,
        seen: false,
        upcomingEvent: {
          $exists: true,
        },
      });

      const filtered = notifications
        .filter(
          (event) =>
            new Date(event.upcomingEvent.start?.dateTime) > currentTimeISO,
        )
        .sort(
          (a, b) =>
            new Date(a.upcomingEvent.start?.dateTime).getTime() -
            new Date(b.upcomingEvent.start?.dateTime).getTime(),
        )[0];

      return filtered;
    } catch (error) {
      console.error("Error getting notification:", error);
      throw new Error("Failed to get notification");
    }
  }

  async getAllNotificationsForUser(userId: string): Promise<Notification[]> {
    try {
      await dbConnect();

      const notifications = await Notification.find({
        userId,
      }).sort({ createdAt: -1 });

      return notifications;
    } catch (error) {
      console.error("Error getting notifications:", error);
      throw new Error("Failed to get notifications");
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      await dbConnect();

      const count = await Notification.countDocuments({
        userId,
        seen: false,
      });

      return count;
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      throw new Error("Failed to get unread notification count");
    }
  }

  async createTaskAssignmentNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    assignedBy: string,
  ): Promise<Notification> {
    try {
      await dbConnect();

      const notification = await Notification.create({
        userId,
        type: "task_assignment",
        message: `You have been assigned a new task: ${taskTitle}`,
        taskId,
        taskTitle,
        seen: false,
      });

      return notification;
    } catch (error) {
      console.error("Error creating task assignment notification:", error);
      throw new Error("Failed to create task assignment notification");
    }
  }

  async createNotificationIfDoesntExist(
    userId: string,
    type: string,
    message: string,
    events: string[],
  ): Promise<Notification[] | null> {
    try {
      await dbConnect();

      const notifications: Notification[] = [];

      for (const event of events) {
        const existingNotification = await Notification.findOne({
          userId,
          type: type,
          upcomingEvent: event,
        });
        if (!existingNotification) {
          console.log(
            "No existing notification found, creating a new one with the following details",
          );
          const notification = await Notification.create({
            userId,
            type: type,
            message: message,
            upcomingEvent: event,
          });
          console.log(notification);
          notifications.push(notification);
        } else {
          console.log("Notification already exists:", existingNotification._id);
        }
      }
      return notifications;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new Error("Failed to create notification");
    }
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification | null> {
    try {
      await dbConnect();

      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { seen: true },
        { new: true },
      );
      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw new Error("Failed to mark notification as read");
    }
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      await dbConnect();

      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        userId,
      });

      return !!result;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw new Error("Failed to delete notification");
    }
  }
}
