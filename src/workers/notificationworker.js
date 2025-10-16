import { Worker } from "bullmq";
import Notification from "../models/notification.model.js";
import { redisConnection } from "../Utils/redisclient.js";

export const notificationWorker = new Worker(
  "notification-queue",
  async (job) => {
    const { user, actor, type, post, comment } = job.data;

    // Avoid notifying the same user about their own action
    if (user.toString() === actor.toString()) return;

    await Notification.create({
      user,
      actor,
      type,
      post,
      comment,
    });

    //  Will emit real-time update if using Socket.io(cuurently not using it)
    // io.to(user.toString()).emit("new-notification", { type, actor, post, comment });
  },
  { connection: redisConnection }
);


notificationWorker.on("failed", (job, err) => {
  console.error(`❌ Notification job failed: ${job.id}`, err);
});
