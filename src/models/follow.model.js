import mongoose from "mongoose";
const { Schema } = mongoose;

const followSchema = new Schema({
  follower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  followee: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true });

// Prevent duplicate follow records
followSchema.index({ follower: 1, followee: 1 }, { unique: true });

export default mongoose.model("Follow", followSchema);
