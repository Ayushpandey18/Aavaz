import mongoose from "mongoose";
const { Schema } = mongoose;

const commentSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true },
  parent: { type: Schema.Types.ObjectId, ref: "Comment", default: null }, // null = top-level comment
  likeCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parent: 1, createdAt: -1 }); // efficient reply lookups

export default mongoose.model("Comment", commentSchema);
