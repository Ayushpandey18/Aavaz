import asyncHandler from "../Utils/asyncHandler.js";
import apierror from "../Utils/apierror.js";
import { apiresponse } from "../Utils/apiresponse.js";
import Notification from "../models/notification.model.js";
import redis from "../Utils/redisclient.js";

const NOTIF_CACHE_PREFIX = "notifications:";

// 🔹 Get notifications for a user
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const cacheKey = `${NOTIF_CACHE_PREFIX}${userId}`;

  // 1️⃣ Try Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res
      .status(200)
      .json(new apiresponse(200, "Notifications fetched (cached)", JSON.parse(cached)));
  }

  // 2️⃣ Fetch from MongoDB if cache miss
  const notifications = await Notification.find({ user: userId })
    .populate("actor", "username avatarUrl _id")
    .populate("post", "_id content")
    .populate("comment", "_id content")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // 3️⃣ Store in Redis with TTL
  await redis.set(cacheKey, JSON.stringify(notifications), "EX", 60 * 5); // 5 min TTL

  res.status(200).json(new apiresponse(200, "Notifications fetched", notifications));
});

// 🔹 Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true } }
  );

  // Clear cache
  await redis.del(`${NOTIF_CACHE_PREFIX}${userId}`);

  res
    .status(200)
    .json(
      new apiresponse(
        200,
        "All notifications marked as read",
        { modifiedCount: result.modifiedCount }
      )
    );
});

// 🔹 Mark a single notification as read
export const markOneAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notif = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notif) throw new apierror("Notification not found", 404);

  notif.read = true;
  await notif.save();

  // Clear cache
  await redis.del(`${NOTIF_CACHE_PREFIX}${userId}`);

  res
    .status(200)
    .json(new apiresponse(200, "Notification marked as read", notif));
});

// 🔹 Clear all notifications (optional)
export const clearNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.deleteMany({ user: userId });

  // Clear cache
  await redis.del(`${NOTIF_CACHE_PREFIX}${userId}`);

  res
    .status(200)
    .json(
      new apiresponse(
        200,
        "All notifications cleared",
        { deletedCount: result.deletedCount }
      )
    );
});
