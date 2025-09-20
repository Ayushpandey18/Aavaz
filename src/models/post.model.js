import mongoose from "mongoose";
const { Schema } = mongoose;

// GeoJSON Point schema (no validation)
const mediaSchema = new Schema({
  url: { type: String, required: true },       // secure_url for frontend
  publicId: { type: String, required: true },  // public_id for deletion
}, { _id: false });
const pointSchema = new Schema({
  type: { type: String, enum: ["Point"], required: true },
  coordinates: { type: [Number], required: true }, // [lng, lat]
});

const postSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  kind: { 
    type: String, 
    enum: ["opinion", "issue", "idea", "achievement","personal"],
    required: true,
    index: true
  },
  content: { type: String, required: true, trim: true },
  media: [mediaSchema], // array of media URLs
  tags: [{ type: String, lowercase: true, trim: true }],
  location: { type: pointSchema, index: "2dsphere" },
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 }, // updated when new comments are added
  language: { type: String, trim: true },
}, { timestamps: true });

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ kind: 1, createdAt: -1 });
export default mongoose.model("Post", postSchema);
