
import mongoose from "mongoose";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Chat extends mongoose.Document {
  _id: string;
  userId: string;
  chatId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new mongoose.Schema<Chat>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true
  },
  chatId: {
    type: String,
    required: [true, "Chat ID is required"],
    index: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Chat || mongoose.model<Chat>("Chat", ChatSchema);
