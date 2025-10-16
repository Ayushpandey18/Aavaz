import { Worker } from "bullmq";
import redis from "../Utils/redisclient.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { redisConnection } from "../Utils/redisclient.js";

const feedLimit = 400;
const TTL = 60 * 15;

// Redis feed storage
async function storeFeedInRedis(userId, type, posts) {
  const key = `feed:user:${userId}:${type}`;
  const pipeline = redis.pipeline();
  pipeline.del(key);
  posts.forEach((p) => pipeline.rpush(key, JSON.stringify(p)));
  pipeline.expire(key, TTL);
  await pipeline.exec();
}

// Scoring function
const computeScore = (post) => {
  const ageHours = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
  const recency = Math.max(0, 72 - ageHours);
  return post.likeCount * 2 + post.commentCount * 3 + recency;
};

// Pagination utility
const paginate = (posts, feedno) => posts.slice(feedno * feedLimit, (feedno + 1) * feedLimit);

// Fetch top N posts efficiently
const fetchTopPosts = async (filter = {}, limit = 2000) => {
  return Post.find(filter).populate("author","username name _id")
    .sort({ likeCount: -1, commentCount: -1, createdAt: -1 }) // rough top posts
    .limit(limit)
    .lean();
};

// Main feed
const mainfeed = async (userId, feedno) => {
  const posts = await fetchTopPosts({}, 2000);
  const scored = posts.map((p) => ({ ...p, score: computeScore(p) }))
                      .sort((a, b) => b.score - a.score);
  await storeFeedInRedis(userId, "main", paginate(scored, feedno));
};

// Locality feed
const localityfeed = async (user, userId, feedno) => {
  if (!user.homeLocation?.coordinates) return;

  const [lng, lat] = user.homeLocation.coordinates;
  const nearby = await Post.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: 15000,
      },
    },
  })
  .populate("author","username name _id")
    .sort({ likeCount: -1, commentCount: -1, createdAt: -1 })
    .limit(1000)
    .lean();

  const scored = nearby.map((p) => ({ ...p, score: computeScore(p) }))
                       .sort((a, b) => b.score - a.score);

  await storeFeedInRedis(userId, "locality", paginate(scored, feedno));
};

// Achievement feed
const achievementfeed = async (userId, feedno) => {
  const posts = await fetchTopPosts({ kind: "achievement" }, 1000);
  const scored = posts.map((p) => ({ ...p, score: computeScore(p) }))
                      .sort((a, b) => b.score - a.score);
  await storeFeedInRedis(userId, "achievements", paginate(scored, feedno));
};

// Worker
export const feedworker = new Worker(
  "feed-generation",
  async (job) => {
    try {
       console.log("hello");
      const { userId, feedno, type } = job.data;
      const user = await User.findById(userId).lean();
      if (!user) return;

      // Generate all feeds in parallel if requested
      if (type === "all") {
        await Promise.all([
          mainfeed(userId, feedno),
          localityfeed(user, userId, feedno),
          achievementfeed(userId, feedno),
        ]);
      } else if (type === "main") await mainfeed(userId, feedno);
      else if (type === "locality") await localityfeed(user, userId, feedno);
      else if (type === "achievements") await achievementfeed(userId, feedno);
    } catch (err) {
      console.error("Feed generation error:", err, job.data);
      throw err; 
    }
  },
  { connection: redisConnection }
);
