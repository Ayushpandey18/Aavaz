import { Router } from "express";
import verifyJWT from "../middlewares/Auth.middleware.js";
import {
  togglePostLike,
  toggleCommentLike,
  getPostLikes,
  getCommentLikes,
} from "../controllers/like.controller.js";

const likeRouter = Router();

// 🔹 Like / Unlike a Post
likeRouter.route("/post/:postId").post(verifyJWT, togglePostLike);

// 🔹 Like / Unlike a Comment
likeRouter.route("/comment/:commentId").post(verifyJWT, toggleCommentLike);

// 🔹 Get all likes for a specific Post
likeRouter.route("/post/:postId").get(getPostLikes);

// 🔹 Get all likes for a specific Comment
likeRouter.route("/comment/:commentId").get(getCommentLikes);

export default likeRouter;
