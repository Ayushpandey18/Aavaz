import express from "express";
import verifyJWT from "../middlewares/Auth.middleware.js";
import {
  getNotifications,
  markAllAsRead,
  markOneAsRead,
  clearNotifications,
} from "../controllers/notification.controller.js";

const notificationrouter = express.Router();

notificationrouter.get("/", verifyJWT, getNotifications);
notificationrouter.patch("/read-all", verifyJWT, markAllAsRead);
notificationrouter.patch("/read/:notificationId", verifyJWT, markOneAsRead);
notificationrouter.delete("/clear", verifyJWT, clearNotifications);

export default notificationrouter;
