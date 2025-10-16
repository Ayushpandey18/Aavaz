import mongoose from "mongoose";
const { Schema } = mongoose;
const likeSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
  }, { timestamps: true });
  
  likeSchema.index({ user: 1, post: 1 }, { unique: true });
  likeSchema.index({ user: 1, comment: 1 }, { unique: true });
  
  export default mongoose.model("Like", likeSchema);
  