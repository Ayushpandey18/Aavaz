import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../Utils/cloudinary.js";
import apierror from "../Utils/apierror.js";
import { apiresponse } from "../Utils/apiresponse.js";
import async_Handler from "../Utils/asyncHandler.js";
import bcrypt from "bcrypt";
import redis from "../Utils/redisclient.js"; // assuming you have a redis client
import jwt from "jsonwebtoken";

/**
 * @route   POST /auth/register
 * @desc    Register a new user (requires OTP verification)
 */
const generateAccessTokenandRefreshToken= async(userId)=>{
  try {
      const user=await User.findById(userId)
      const accessToken=user.generateAccessToken()
      const refreshToken=user.generateRefreshToken()
      return {accessToken,refreshToken}
  } catch (error) {
      throw new apierror("error generating tokens",500)
  }
}
export const registerUser = async_Handler(async (req, res, next) => {
  const { name, username, email, password, phoneNumber, otp, bio} = req.body;

  // 1️⃣ Validate input
  if (!name || !username || !phoneNumber || !password || !otp) {
    throw new apierror("All required fields must be provided", 400);
  }

  // 2️⃣ Verify OTP from Redis
  const storedOtp = await redis.get(`otp:${phoneNumber}`);
  if (!storedOtp) {
    throw new apierror("OTP expired or not found. Please request a new one.", 400);
  }

  if (storedOtp !== otp) {
    throw new apierror("Invalid OTP provided", 400);
  }

  // OTP is valid → delete it so it can't be reused
  await redis.del(`otp:${phoneNumber}`);

  // 3️⃣ Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }, { phoneNumber }],
  });
  if (existingUser) {
    throw new apierror("User with this email/username/phone already exists", 409);
  }

  // 4️⃣ Handle avatar upload (optional)
  let avatarUrl = null;
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.path);
    avatarUrl = result?.secure_url || null;
  }

  // 5️⃣ Create user
  const user = await User.create({
    name,
    username,
    email,
    password,
    phoneNumber,
    bio,
    isPhoneVerified: true, // ✅ since OTP is verified
    avatarUrl,
  });

  // 6️⃣ Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  await redis.setex(`refreshToken:${user._id}`, 2592000, refreshToken);

  // 7️⃣ Send success response
  return res
    .status(201)
    .json(
      new apiresponse(201, "User registered successfully", {
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
        },
        tokens: { accessToken, refreshToken },
      })
    );
});
export const loginUser=async_Handler(async(req,res,next)=>{
  const {phoneNumber,password}=req.body;
  if(!phoneNumber|| !password)
  {
    throw new apierror("All fields are required",401);
  }
  const user = await User.findOne({ phoneNumber }).select("+password");
  if(!user){
    throw new apierror("User Not Found",404)
  }
  const isPasswordMatch=await user.isPasswordCorrect(password)
  if(!isPasswordMatch){
    throw new apierror("Password is invalid",401)
  }
  const {accessToken,refreshToken}=await generateAccessTokenandRefreshToken(user._id)
  await redis.setex(`refreshToken:${user._id}`, 2592000, refreshToken);
  const loggedinuser=await User.findById(user._id).select(
      "-password"
  )
  const options={
      httpOnly: true,
      secure:true
  }
  return res.status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options).json(
      new apiresponse(200,"user logged in successfully",{user:loggedinuser,accessToken,refreshToken
      })
  )
})
export const refreshAccessToken=async_Handler(async(req,res)=>{
  const incomingrefreshToken=req.cookies.refreshToken||req.body.refreshToken
  if(!incomingrefreshToken){
      throw new apierror("refresh token is required",400)
  }
try {
  const decodedtoken= jwt.verify(
      incomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
  )
  const user=await User.findById(decodedtoken._id)
  if(!user){
      throw new apierror("user not found",404)
  }
  const userRefreshToken=await redis.get(`refreshToken:${user._id}`);
  if(incomingrefreshToken!==userRefreshToken){
      throw new apierror("invalid refresh token",403)
  }
  const options={
      httpOnly: true,
      secure:true
  }
  const accessToken=user.generateAccessToken();
  return res.status(200).cookie("accessToken",accessToken,options).json(
      new apiresponse(200,"new access token generated successfully",{accessToken})
  )
} catch (error) {
  throw new apierror(`invalid refresh token`,401)
}
})
export const logoutUser = async_Handler(async (req, res, next) => {
  const  userId=req.user._id
    // remove refresh token from Redis
    await redis.del(`refreshToken:${userId}`);
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "strict", // must match original
      path: "/"           // must match original
    };
  
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new apiresponse(200, "User logged out successfully"));
  });
export const changeCurrentPassword = async_Handler(async (req, res) => {
    const { oldpassword, newpassword } = req.body;
  
    // validate input
    if (!oldpassword || !newpassword) {
      throw new apierror("Old and new password are required", 400);
    }
  
    // find user
    const user = await User.findById(req.user?._id).select("+password");
    if (!user) {
      throw new apierror("User not found", 404);
    }
  
    // check old password
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);
    if (!isPasswordCorrect) {
      throw new apierror("Wrong old password", 400);
    }
  
    // set new password
    user.password = newpassword; // will be hashed by pre("save") hook
    await user.save();
  
    return res.status(200).json(
      new apiresponse(200, "Password changed successfully")
    );
  });
export const verifyOtpAndResetPassword = async_Handler(async (req, res) => {
    const { phoneNumber, otp, newpassword } = req.body;
  
    const user = await User.findOne({ phoneNumber }).select("+password");
    if (!user) {
      throw new apierror("User not found", 404);
    }
  
    // Fetch OTP from Redis
    const storedOtp = await redis.get(`otp:${phoneNumber}`);
    if (!storedOtp) {
      throw new apierror("OTP expired or not found", 400);
    }
  
    if (storedOtp !== otp) {
      throw new apierror("Invalid OTP", 400);
    }
  
    // Update password
    user.password = newpassword;
    await user.save();
  
    // Remove OTP from Redis
    await redis.del(`otp:${phoneNumber}`);
  
    // Invalidate refresh tokens (force re-login)
    await redis.del(`refreshToken:${user._id}`);

    return res.status(200).json(new apiresponse(200, "Password changed successfully"));
  });
  
export const updateProfile = async_Handler(async (req, res) => {
    const { name, bio } = req.body;
  
    // find user
    const user = await User.findById(req.user._id);
    if (!user) throw new apierror("User not found", 404);
  
    // update text fields if provided
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
  
    // upload avatar if file exists
    if (req.file) {
      const avatarUrl = await uploadOnCloudinary(req.file.path);
      user.avatarUrl = avatarUrl;
    }
  
    await user.save();
    await redis.del(`user:profile:${user._id}`);
    await redis.del(`user:username:${user.username}`);
    const updatedUser = await User.findById(user._id).select("-password");
  
    return res.status(200).json(
      new apiresponse(200, "Profile updated successfully", { user: updatedUser })
    );
  });
  export const getCurrentUser = async_Handler(async (req, res) => {
    const userId = req.user._id;
  
    // 1️⃣ Try Redis cache
    const cachedUser = await redis.get(`user:profile:${userId}`);
    if (cachedUser) {
      return res.status(200).json(
        new apiresponse(200, "Current user profile fetched (from cache)", JSON.parse(cachedUser))
      );
    }
  
    // 2️⃣ Fetch from DB
    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) throw new apierror("User not found", 404);
  
    // 3️⃣ Store in Redis (5 minutes)
    await redis.setex(`user:profile:${userId}`, 300, JSON.stringify(user));
  
    return res.status(200).json(
      new apiresponse(200, "Current user profile fetched successfully", user)
    );
  });
  export const getUserProfile = async_Handler(async (req, res) => {
    const { username } = req.params;
  
    // 1️⃣ Try Redis cache
    const cachedUser = await redis.get(`user:username:${username}`);
    if (cachedUser) {
      return res.status(200).json(
        new apiresponse(200, "User profile fetched (from cache)", JSON.parse(cachedUser))
      );
    }
  
    // 2️⃣ Fetch from DB
    const user = await User.findOne({ username }).select("-password -refreshToken");
    if (!user) throw new apierror("User not found", 404);
  
    // 3️⃣ Store in Redis (5 minutes)
    await redis.setex(`user:username:${username}`, 300, JSON.stringify(user));
  
    return res.status(200).json(
      new apiresponse(200, "User profile fetched successfully", user)
    );
  });
  