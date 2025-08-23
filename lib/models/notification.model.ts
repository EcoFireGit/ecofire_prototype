// models/Notification.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface Notification extends Document {
  userId: string;
  type: string;
  message: string;
  upcomingEvent?: Record<string, any>;
  taskId?: string;
  taskTitle?: string;
  seen: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<Notification>({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  upcomingEvent: { type: Object },
  taskId: { type: String },
  taskTitle: { type: String },
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Notification ||
  mongoose.model<Notification>('notifications', NotificationSchema);
