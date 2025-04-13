import Notification from '../models/notification.model';
import dbConnect from '../mongodb';


export class NotificationService {
   async getAllUnseenNotificationsAfterCurrentTimeForUser(userId: string, currentTimeISO: Date) : Promise<Notification[]> {
        try {
            await dbConnect();

            const notifications = await Notification.find({
                userId,
                seen: false,
                'upcomingEvent': { 
                    $exists: true
                }
            });

            
            const filtered = notifications.filter(event => {
                return new Date(event.upcomingEvent.start?.dateTime) > currentTimeISO;
            }
                );

                return filtered;
        }catch (error) {
            console.error('Error getting notification:', error);
            throw new Error('Failed to get notification');
        }
    }

    async createNotificationIfDoesntExist(userId: string, type:string, message:string, events: string[]): Promise<Notification[] | null> {

        try {
            await dbConnect();

            const notifications:Notification[]=[];

            for(const event of events){
                const existingNotification = await Notification.findOne({
                    userId,
                    type: type,
                    upcomingEvent : event
                });
                if(!existingNotification){
                    console.log('No existing notification found, creating a new one');
                    const notification = await Notification.create({
                        userId, 
                        type: type,
                        message: message,
                        upcomingEvent: event,
                    });
                    notifications.push(notification);
                }else{
                    console.log('Notification already exists:', existingNotification._id);

                }
            }
            return notifications;
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
