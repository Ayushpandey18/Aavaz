import {feedQueue} from "../queues/feedQueue.js";
import redis from "../Utils/redisclient.js";
import { redisConnection } from "../Utils/redisclient.js";
import asyncHandler from "../Utils/asyncHandler.js";
import apierror from "../Utils/apierror.js";
import {apiresponse} from "../Utils/apiresponse.js";

const feedLimit = 400;

// Helper: fetch feed from Redis
const getFeedFromRedis = async (userId, type, feedno) => {
  const key = `feed:user:${userId}:${type}`;
  const cached = await redis.lrange(key, 0, -1);
  if (!cached || cached.length === 0) return null;

  const feed = cached.map((item) => JSON.parse(item));
  return feed.slice(feedno * feedLimit, (feedno + 1) * feedLimit);
};

// GET feed controller
export const getFeed = asyncHandler(async (req, res) => {
  const  userId = req.user._id;
  const { type = "main", feedno = 0 } = req.query;

  // Validate feedno
  const page = parseInt(feedno, 10);
  if (isNaN(page) || page < 0) throw new apierror("Invalid feed page number", 400);

  // 1️⃣ Try Redis cache for main, locality, or achievements
  if (type !== "all") {
    const cachedFeed = await getFeedFromRedis(userId, type, page);
    if (cachedFeed && cachedFeed.length > 0) {
      return res
        .status(200)
        .json(new apiresponse(200, "Feed fetched from cache", { feed: cachedFeed, cached: true }));
    }
  }
  await feedQueue.add("generateFeed", { userId, feedno: page, type });

  // 3️⃣ Return immediate response; feed will be ready shortly
  return res
    .status(200)
    .json(new apiresponse(200, "Feed generation started, please check again shortly", { feed: [], cached: false }));
});
