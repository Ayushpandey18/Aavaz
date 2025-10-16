import { Queue } from "bullmq";
import { redisConnection } from "../Utils/redisclient.js";

export const notificationQueue = new Queue("notification-queue", {
  connection: redisConnection,
});
