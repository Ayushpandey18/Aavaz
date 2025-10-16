import { Router } from "express";
import verifyJWT from "../middlewares/Auth.middleware.js";
import asyncHandler from "../Utils/asyncHandler.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowing
} from "../controllers/follow.controller.js";

const followrouter = Router();
followrouter.route("/follow/:id").post(verifyJWT,asyncHandler(followUser))
followrouter.route("/unfollow/:id").delete(verifyJWT,asyncHandler(unfollowUser))
followrouter.route("/followers/:username").get(asyncHandler(getFollowers))
followrouter.route("/following/:username").get(asyncHandler(getFollowing))
followrouter.route("/checkfollow/:id").get(verifyJWT,asyncHandler(checkFollowing))
export default followrouter;
