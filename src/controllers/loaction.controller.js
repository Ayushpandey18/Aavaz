import asyncHandler from "../Utils/asyncHandler.js";
import apierror from "../Utils/apierror.js";
import { apiresponse } from "../Utils/apiresponse.js";
import User from "../models/user.model.js";
import redis from "../Utils/redisclient.js";

// GET current user home location
export const getHomeLocation = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Try cache
  const cached = await redis.get(`user:homeLocation:${userId}`);
  if (cached) {
    return res.status(200).json(new apiresponse(200, "Home location fetched (cache)", JSON.parse(cached)));
  }

  const user = await User.findById(userId).select("homeLocation");
  if (!user || !user.homeLocation) {
    throw new apierror("Home location not set", 404);
  }

  // Save to Redis for next time (1 day cache)
  await redis.setex(`user:homeLocation:${userId}`, 86400, JSON.stringify(user.homeLocation));

  return res.status(200).json(new apiresponse(200, "Home location fetched", user.homeLocation));
});

// UPDATE home location
export const updateHomeLocation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { type, coordinates } = req.body;

  if (!type || !coordinates || coordinates.length !== 2) {
    throw new apierror("Invalid location format", 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { homeLocation: { type, coordinates } },
    { new: true }
  ).select("homeLocation");

  // Clear cache
  await redis.del(`user:homeLocation:${userId}`);

  return res.status(200).json(new apiresponse(200, "Home location updated", user.homeLocation));
});
