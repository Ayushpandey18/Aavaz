import asyncHandler from "../Utils/asyncHandler.js";
import {apiresponse} from "../Utils/apiresponse.js";
import apierror from "../Utils/apierror.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js"
import { uploadMultipleOnCloudinary,deleteFromCloudinary,deleteMultipleFromCloudinary } from "../Utils/cloudinary.js";
import redis from "../Utils/redisclient.js";
export const createPost = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new apierror("Unauthorized",401);
  
    const { kind, content, tags = [], language } = req.body;
    let { location } = req.body;
  
    if (!kind || !content) {
      throw new apierror("Kind and content are required",400);
    }
  
    // ✅ Enforce location
    if (!location) {
      if (req.user?.homeLocation) {
        location = req.user.homeLocation; // fallback to user’s saved home location
      } else {
        throw new apierror( "Location is required. Please provide one or set a home location.",400);
      }
    }
  
    // ✅ Validate location format
    if (
      !location.type ||
      location.type !== "Point" ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      throw new apierror("Invalid location format. Must be { type: 'Point', coordinates: [lng, lat] }",400);
    }
  
    let media = [];
if (req.files && req.files.length > 0) {
  const uploadResults = await uploadMultipleOnCloudinary(req.files);
  media = uploadResults.map((file) => ({
    url: file.secure_url,
    publicId: file.public_id,
  }));
}
  
    const post = await Post.create({
      author: userId,
      kind,
      content,
      media,
      tags,
      location,
      language,
    });
  
    return res
      .status(201)
      .json(new apiresponse(201, "Post created successfully", post));
  });
  // ✅ GET /posts/:id → Fetch a single post by ID
  export const getPostById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cachedPost = await redis.get(`post:${id}`);
  if (cachedPost) {
    return res
      .status(200)
      .json(new apiresponse(200, "Post fetched (cache)", JSON.parse(cachedPost)));
  }
    const post = await Post.findById(id).populate("author", "username name");
    if (!post) throw new apierror( "Post not found",404);
    await redis.setex(`post:${id}`, 600, JSON.stringify(post));
    return res
      .status(200)
      .json(new apiresponse(200,"Post fetched successfully", post));
  });
  
  // ✅ PUT /posts/:id → Update post (author only)
  export const updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
  
    const post = await Post.findById(id);
    if (!post) throw new apierror("Post not found",404);
  
    if (post.author.toString() !== userId.toString()) {
      throw new apierror( "Not authorized to update this post",403);
    }
    const { content, tags, kind, language } = req.body;
  
    if (content) post.content = content;
    if (tags) post.tags = tags;
    if (kind) post.kind = kind;
    if (language) post.language = language;
    await post.save();
    await redis.del(`post:${id}`)
    return res
      .status(200)
      .json(new apiresponse(200, "Post fetched successfully",post));
  });
  
  // ✅ DELETE /posts/:id → Delete post + media cleanup
  export const deletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
  
    const post = await Post.findById(id);
    if (!post) throw new apierror("Post not found",404);
  
    if (post.author.toString() !== userId.toString()) {
      throw new apierror("Not authorized to delete this post",403);
    }
  
    // Delete media from Cloudinary
    for (const file of post.media) {
      await deleteFromCloudinary(file.publicId);
    }
    await redis.del(`post:${id}`)
    await Post.findByIdAndDelete(id);
  
    return res
      .status(200)
      .json(new apiresponse(200,"Post deleted successfully",{}));
  });
  export const allposts=asyncHandler(async(req,res)=>{
    const posts=await Post.find({});
    if(!posts) throw new apierror("No posts found",404)
      return res.status(200).json(new apiresponse(200,"Posts fetched successfully",posts))
  })
  const POSTS_CACHE_PREFIX = "posts:";
  const PAGE_SIZE = 50;

// 🔹 Get posts by username
export const getPostsByUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const page = parseInt(req.query.page) || 1;
  const cacheKey = `${POSTS_CACHE_PREFIX}user:${username}:page:${page}`;

  // Try Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res
      .status(200)
      .json(new apiresponse(200, `Posts by ${username} (cached)`, JSON.parse(cached)));
  }

  // Get user
  const user = await User.findOne({ username });
  if (!user) throw new apierror("User not found", 404);

  // Fetch posts with pagination
  const posts = await Post.find({ author: user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  // Store in Redis
  await redis.set(cacheKey, JSON.stringify(posts), "EX", 60 * 5); // 5 min TTL

  res.status(200).json(new apiresponse(200, `Posts by ${username}`, posts));
});
// 🔹 Get posts by tag
export const getPostsByTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const page = parseInt(req.query.page) || 1;
  const cacheKey = `${POSTS_CACHE_PREFIX}tag:${tag.toLowerCase()}:page:${page}`;

  // Try Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res
      .status(200)
      .json(new apiresponse(200, `Posts with tag #${tag} (cached)`, JSON.parse(cached)));
  }

  const posts = await Post.find({ tags: { $in: [tag.toLowerCase()] } })
    .populate("author","username name _id")
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  await redis.set(cacheKey, JSON.stringify(posts), "EX", 60 * 5); // 5 min TTL

  res.status(200).json(new apiresponse(200, `Posts with tag #${tag}`, posts));
});
