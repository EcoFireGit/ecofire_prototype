import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userId: string;
  organizationId?: string | null;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: String, required: true },
    organizationId: { type: String, required: false, default: null },
    title: { type: String, required: false },
    content: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema); 