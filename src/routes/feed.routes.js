import express from "express";
import { getFeed } from "../controllers/feed.controller.js";
import verifyJWT from "../middlewares/Auth.middleware.js";

const feedrouter = express.Router();

// GET /api/feed/:userId?type=main&feedno=0
feedrouter.get("/",verifyJWT, getFeed);

export default feedrouter;
