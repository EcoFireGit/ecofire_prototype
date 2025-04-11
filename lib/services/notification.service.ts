import Notification from '../models/notification.model';
import dbConnect from '../mongodb';


export class NotificationService {
   async getAllUnseenNotifications(userId: string) : Promise<Notification[]> {
        try {
            await dbConnect();

            const notifications = await Notification.find({
                userId, 
                seen: false
            });
            console.log('Notification fetched:', notifications);
            return notifications;
        }catch (error) {
            console.error('Error getting notification:', error);
            throw new Error('Failed to get notification');
        }
    }

    async createNotificationIfDoesntExist(userId: string, type:string, message:string, events: string[]): Promise<Notification | null> {

        try {
            await dbConnect();

            const existingNotification = await Notification.findOne({
                userId,
                type: type,
                data: { upcomingEvents: events }
            });
            if(!existingNotification){
                console.log('No existing notification found, creating a new one');
                const notification = await Notification.create({
                    userId, 
                    type: type,
                    message: message,
                    data: { upcomingEvents: events },
                });
                console.log('Notification created:', notification._id);
                return notification;
            }
            console.log('Notification already exists:', existingNotification._id);
            return existingNotification;
        }catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Failed to create notification');
        }
    }

    async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification | null> {
        try {
            await dbConnect();

            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { seen: true },
                { new: true }
            );
            return notification;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw new Error('Failed to mark notification as read');
        }
    }
}
