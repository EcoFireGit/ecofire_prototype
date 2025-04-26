import mongoose from 'mongoose';

// Schema to track whether default business functions have been initialized for a user
const DefaultsTrackerSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  initialized: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

const DefaultsTracker = mongoose.models.DefaultsTracker || 
                        mongoose.model('DefaultsTracker', DefaultsTrackerSchema);

export default DefaultsTracker;