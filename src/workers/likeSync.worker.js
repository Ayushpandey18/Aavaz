// src/workers/likeSync.worker.js
import mongoose from "mongoose";
import Post from "../models/post.model.js";
import redis from "../utils/redisClient.js";

const FLUSH_INTERVAL_MS = 5000;
const BATCH_SIZE = 20;

let running = false;

async function flushLikeCounts() {
  if (running) return;
  running = true;

  try {
    const all = await redis.hgetall("post:likecount");
    const entries = Object.entries(all);

    if (!entries.length) return;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async ([postId, deltaStr]) => {
          const delta = parseInt(deltaStr, 10);
          if (!delta || delta === 0) {
            await redis.hdel("post:likecount", postId);
            return;
          }

          await Post.updateOne({ _id: postId }, { $inc: { likeCount: delta } });
          await redis.hdel("post:likecount", postId);
        })
      );
    }
  } catch (err) {
    console.error("Error flushing like counts:", err);
  } finally {
    running = false;
  }
}

export function startLikeSyncWorker() {
  setInterval(flushLikeCounts, FLUSH_INTERVAL_MS);
  flushLikeCounts().catch((err) => console.error(" Initial flush error:", err));
}
