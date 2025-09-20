import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema({
  // User who RECEIVES the notification
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

  // User who triggered the notification (actor)
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // Type of notification
  type: { 
    type: String, 
    enum: ["like", "comment", "follow"], 
    required: true 
  },

  // Related objects (depending on type)
  post: { type: Schema.Types.ObjectId, ref: "Post" },
  comment: { type: Schema.Types.ObjectId, ref: "Comment" },

  // Status flags
  read: { type: Boolean, default: false },
}, { timestamps: true });

// Indexes for fast retrieval
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
