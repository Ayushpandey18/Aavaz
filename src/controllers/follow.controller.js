import mongoose from "mongoose";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import {apiresponse} from "../Utils/apiresponse.js";
import apierror from "../Utils/apierror.js";
import redis from "../Utils/redisclient.js";

/**
 * Follow a user
 */
export const followUser = async (req, res) => {
    const followerId = req.user._id;
    const followeeId = req.params.id;
  
    if (followerId.toString() === followeeId.toString()) {
      throw new apierror("You cannot follow yourself", 400);
    }
  
    const session = await mongoose.startSession();
  
    try {
      await session.withTransaction(async () => {
        const [follower, followee] = await Promise.all([
          User.findById(followerId).session(session),
          User.findById(followeeId).session(session),
        ]);
  
        if (!followee) throw new apierror("User to follow not found", 404);
  
        // Ensure relation doesn't exist already
        const existing = await Follow.findOne({ follower: followerId, followee: followeeId }).session(session);
        if (existing) {
          return res.json(new apiresponse(200,"Already following"));
        }
  
        // Create follow relation
        await Follow.create([{ follower: followerId, followee: followeeId }], { session });
  
        // Update counters
        followee.followerCount = (followee.followerCount || 0) + 1;
        follower.followingCount = (follower.followingCount || 0) + 1;
  
        await Promise.all([followee.save({ session }), follower.save({ session })]);
  
        // Cache invalidation
        await redis.del(`user:${followee.username}`);
        await redis.del(`user:${follower.username}`);
        await redis.del(`followers:${followee.username}:*`);
        await redis.del(`following:${follower.username}:*`);
  
        res.json(new apiresponse(200,"Followed Successfully"));
      });
    } finally {
      session.endSession(); // only once, after transaction is done
    }
  };  

/**
 * Unfollow a user
 */
export const unfollowUser = async (req, res) => {
    const followerId = req.user._id;
    const followeeId = req.params.id;
  
    if (followerId.toString() === followeeId.toString()) {
      throw new apierror("You cannot unfollow yourself", 400);
    }
  
    const session = await mongoose.startSession();
  
    try {
      await session.withTransaction(async () => {
        const relation = await Follow.findOneAndDelete({ follower: followerId, followee: followeeId }).session(session);
  
        if (!relation) {
          return res.json(new apiresponse(200,"Not Following"));
        }
  
        const [follower, followee] = await Promise.all([
          User.findById(followerId).session(session),
          User.findById(followeeId).session(session),
        ]);
  
        if (followee) followee.followerCount = Math.max(0, (followee.followerCount || 1) - 1);
        if (follower) follower.followingCount = Math.max(0, (follower.followingCount || 1) - 1);
  
        await Promise.all([
          followee?.save({ session }),
          follower?.save({ session }),
        ]);
  
        // Cache invalidation
        await redis.del(`user:${followee.username}`);
        await redis.del(`user:${follower.username}`);
        await redis.del(`followers:${followee.username}:*`);
        await redis.del(`following:${follower.username}:*`);
  
        res.json(new apiresponse(200,"Unfollowed Successfully"));
      });
    } finally {
      session.endSession(); // only once
    }
  };
  

/**
 * Get followers list
 */
export const getFollowers = async (req, res) => {
  const username = req.params.username;
  const { page = 1, limit = 20 } = req.query;

  const cacheKey = `followers:${username}:page:${page}:limit:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(new apiresponse( 200, "OK (cache)",JSON.parse(cached)));
  }

  const user = await User.findOne({ username }).select("_id");
  if (!user) throw new apierror("User not found", 404);

  const skip = (page - 1) * limit;
  const followers = await Follow.find({ followee: user._id })
    .skip(skip)
    .limit(Number(limit))
    .populate("follower", "username avatarUrl bio followerCount followingCount");

  const data = followers.map(f => f.follower);

  await redis.setex(cacheKey, 60, JSON.stringify(data)); // 60s cache

  return res.json(new apiresponse(200,"OK", data));
};

/**
 * Get following list
 */
export const getFollowing = async (req, res) => {
  const username = req.params.username;
  const { page = 1, limit = 50 } = req.query;

  const cacheKey = `following:${username}:page:${page}:limit:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(new apiresponse( 200,"OK (cache)", JSON.parse(cached) ));
  }

  const user = await User.findOne({ username }).select("_id");
  if (!user) throw new apierror("User not found", 404);

  const skip = (page - 1) * limit;
  const following = await Follow.find({ follower: user._id })
    .skip(skip)
    .limit(Number(limit))
    .populate("followee", "username avatarUrl bio followerCount followingCount");

  const data = following.map(f => f.followee);

  await redis.setex(cacheKey, 60, JSON.stringify(data));

  return res.json(new apiresponse(200,"OK", data ));
};
