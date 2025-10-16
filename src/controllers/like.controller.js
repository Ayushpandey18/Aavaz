import Like from "../models/like.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comments.model.js";
import redis from "../Utils/redisclient.js";
import asyncHandler from "../Utils/asyncHandler.js";
import { apiresponse } from "../Utils/apiresponse.js";
import apierror from "../Utils/apierror.js";
import { notificationQueue } from "../queues/notificationQueue.js";

/**
 * @desc Toggle like on a post
 * @route POST /api/likes/post/:postId
 * @access Private
 */
export const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  // ✅ Check if post exists
  const post = await Post.findById(postId);
  if (!post) throw new apierror("Post not found",404);

  const existing = await Like.findOne({ user: userId, post: postId });

  if (existing) {
    // Unlike
    await existing.deleteOne();
    await redis.hincrby("post:likecount", postId, -1);
    return res
      .status(200)
      .json(new apiresponse(200, "Post unliked successfully", { liked: false }));
  }

  // Like
  try {
    await Like.create({ user: userId, post: postId });
    await notificationQueue.add("new-like", {
      user: post.author,   // post owner gets the notification
      actor: userId,       // the liker
      type: "like",
      post: postId,
    });
    await redis.hincrby("post:likecount", postId, 1);
  } catch (err) {
    if (err.code === 11000) throw new apierror("Already liked this post", { liked: true });
    throw err;
  }

  return res
    .status(200)
    .json(new apiresponse(200, "Post liked successfully", { liked: true }));
});

/**
 * @desc Toggle like on a comment
 * @route POST /api/likes/comment/:commentId
 * @access Private
 */
export const toggleCommentLike = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingLike = await Like.findOne({ user: userId, comment: commentId }).session(session);

    if (existingLike) {
      // Remove like
      await existingLike.deleteOne({ session });
      await Comment.updateOne(
        { _id: commentId },
        { $inc: { likeCount: -1 } },
        { session }
      );
      await session.commitTransaction();
      return res.status(200).json(new apiresponse(200, "Comment unliked",{ liked: false }));
    } else {
      // Add like
      await Like.create([{ user: userId, comment: commentId }], { session });
      await Comment.updateOne(
        { _id: commentId },
        { $inc: { likeCount: 1 } },
        { session }
      );
      await session.commitTransaction();
      return res.status(200).json(new apiresponse(200, "Comment liked",{ liked: true }));
    }
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    throw new apierror("Failed to toggle comment like",500);
  } finally {
    session.endSession();
  }
};


/**
 * @desc Get likes on a post
 * @route GET /api/likes/post/:postId
 * @access Public
 */
export const getPostLikes = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const post = await Post.findById(postId);
  if (!post) throw new apierror("Post not found",404);
  const cacheKey = `post:likes:${postId}:page:${page}:limit:${limit}`;
    const cached = await redis.get(cacheKey);
    if(cached) res.status(200).json(new apiresponse(200,  "Fetched post likes successfully",JSON.parse(cached)));
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const likes = await Like.find({ post: postId })
    .skip(skip)
    .limit(parseInt(limit, 50))
    .populate("user", "username avatarUrl _id")
    .lean();
    await redis.set(cacheKey, JSON.stringify(likes), "EX", 60);
  return res
    .status(200)
    .json(new apiresponse(200,  "Fetched post likes successfully",likes));
});

/**
 * @desc Get likes on a comment
 * @route GET /api/likes/comment/:commentId
 * @access Public
 */
export const getCommentLikes = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) throw new apierror( "Comment not found",404);

  const likes = await Like.find({ comment: commentId })
    .populate("user", "username avatarUrl _id")
    .lean();

  return res
    .status(200)
    .json(new apiresponse(200,"Fetched comment likes successfully", likes));
});
