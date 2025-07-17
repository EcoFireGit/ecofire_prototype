import mongoose, { Schema, Document, Types } from "mongoose";

export interface INote extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: false },
    content: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema); 