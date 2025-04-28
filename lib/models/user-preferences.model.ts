import mongoose from "mongoose";

export interface UserPreferences extends mongoose.Document {
  _id: string;
  userId: string;
  enableBackstage: boolean;
  enableTableView: boolean;
}

const UserPreferencesSchema = new mongoose.Schema<UserPreferences>({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    index: true,
    unique: true
  },
  enableBackstage: {
    type: Boolean,
    default: false
  },
  enableTableView: {
    type: Boolean,
    default: false
  }
});

export default mongoose.models.UserPreferences ||
  mongoose.model<UserPreferences>("UserPreferences", UserPreferencesSchema);