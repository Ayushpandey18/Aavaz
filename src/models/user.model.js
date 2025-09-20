import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { Schema } = mongoose;

const pointSchema = new Schema({
  type: { type: String, enum: ["Point"], required: true },
  coordinates: { type: [Number], required: true }, // [lng, lat]
});

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, index: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  avatarUrl: { type: String },
  bio: { type: String, trim: true },
  phoneNumber: { type: String, unique: true, sparse: true, trim: true }, 
  isPhoneVerified: { type: Boolean, default: false },
  langPrefs: { type: [String], default: [] },
  homeLocation: { type: pointSchema, index: "2dsphere" },
  followerCount: { type: Number, default: 0 },   // maintained via Follow collection
  followingCount: { type: Number, default: 0 },  // maintained via Follow collection
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
}, { timestamps: true });

// Indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ homeLocation: "2dsphere" });

// Password hashing middleware
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to verify password
userSchema.methods.isPasswordCorrect = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

// Generate JWT access token
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { _id: this._id, email: this.email, username: this.username, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Generate JWT refresh token
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

export default mongoose.model("User", userSchema);
