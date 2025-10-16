import { Queue } from "bullmq";
import redis from "../Utils/redisclient.js";
import { redisConnection } from "../Utils/redisclient.js";
export const feedQueue = new Queue("feed-generation", {
  connection: redisConnection,
});