import mongoose, { Schema } from "mongoose";

export interface GCalAuth extends mongoose.Document {
  _id: string;
  auth: mongoose.Schema.Types.Mixed;
  userId: string;
  calendars: mongoose.Schema.Types.Mixed;
  createdAt: Date;
  updatedAt: Date;  
}

const GCalAuthSchema = new mongoose.Schema<GCalAuth>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true
  },
  auth: {
    type: Schema.Types.Mixed,
    required: [true, "Please provide google calendar auth object"],
  },
  calendars: [{
    type: Schema.Types.Mixed, 
  }]  
},
{ timestamps: true });


export default mongoose.models.GCalAuth || 
  mongoose.model<GCalAuth>("google_calendar_auths", GCalAuthSchema);