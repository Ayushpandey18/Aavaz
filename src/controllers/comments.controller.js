import mongoose from "mongoose";
import Comment from "../models/comments.model.js";
import Post from "../models/post.model.js";
import redis from "../Utils/redisclient.js";
import asyncHandler from "../Utils/asyncHandler.js";
import { apiresponse } from "../Utils/apiresponse.js";
import apierror from "../Utils/apierror.js";
import {notificationQueue} from "../queues/notificationQueue.js"
/**
 * Create a comment or reply
 */
export const createComment = asyncHandler(async (req, res) => {
  const { postId, content, parentId } = req.body;
  const author = req.user._id;

  if (!postId || !content) throw new apierror("postId and content are required", 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const post = await Post.findById(postId).session(session);
    if (!post) throw new apierror("Post not found", 404);

    let parent = null;
    if (parentId) {
      parent = await Comment.findById(parentId).session(session);
      if (!parent) throw new apierror("Parent comment not found", 404);
    }

    const comment = await Comment.create([{
      post: postId,
      author,
      content,
      parent: parentId || null,
    }], { session });

    // Optionally increment commentCount in Post
    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }, { session });

    await session.commitTransaction();

    // Invalidate Redis cache for this post's top comments
    await redis.del(`post:topcomments:${postId}`);
    await notificationQueue.add("new-comment", {
      user: post.author,   // post owner gets the notification
      actor: author,       // the commenter
      type: "comment",
      post: postId,
      comment: comment[0]._id,
    });
    res.status(201).json(new apiresponse(201, "Comment created successfully", comment[0]));
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

/**
 * Fetch top-level comments for a post (most liked first)
 * Includes caching for hot posts
 */
export const getTopCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!postId) throw new apierror("postId is required", 400);

  const cacheKey = `post:topcomments:${postId}:page:${page}:limit:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.status(200).json(new apiresponse(200, "Comments fetched successfully (cache)", JSON.parse(cached)));

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  // Fetch top-level comments, sorted by likeCount descending, then newest first
  const comments = await Comment.find({ post: postId, parent: null, isDeleted: { $ne: true } })
    .sort({ likeCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .populate("author", "name avatarUrl username _id");

  // Cache for 30 seconds (adjust as needed)
  await redis.set(cacheKey, JSON.stringify(comments), "EX", 60);

  res.status(200).json(new apiresponse(200, "Comments fetched successfully", comments));
});

/**
 * Fetch replies for a comment
 */
export const getRepliesByComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!commentId) throw new apierror("commentId is required", 400);

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const replies = await Comment.find({ parent: commentId, isDeleted: { $ne: true } })
    .sort({ createdAt: 1 }) // oldest first
    .skip(skip)
    .limit(parseInt(limit, 10))
    .populate("author", "name avatarUrl username _id");

  res.status(200).json(new apiresponse(200, "Replies fetched successfully", replies));
});

/**
 * Update a comment
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!content) throw new apierror("Content is required", 400);

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) throw new apierror("Comment not found", 404);

  if (!comment.author.equals(userId)) throw new apierror("Unauthorized", 403);

  comment.content = content;
  await comment.save();

  // Invalidate cache for this post
  await redis.del(`post:topcomments:${comment.post.toString()}:page:1:limit:10`);

  res.status(200).json(new apiresponse(200, "Comment updated successfully", comment));
});

/**
 * Delete a comment (soft delete)
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) throw new apierror("Comment not found", 404);

  if (!comment.author.equals(userId)) throw new apierror("Unauthorized", 403);

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  // Invalidate cache for this post
  await redis.del(`post:topcomments:${comment.post.toString()}:page:1:limit:10`);

  res.status(200).json(new apiresponse(200, "Comment deleted successfully", null));
});
