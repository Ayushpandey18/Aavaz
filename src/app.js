import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import apiLimiter from "./middlewares/ratelimiter.js";
import errorHandler from "./middlewares/error.middleware.js";
const app = express();

// Validate essential environment variable
if (!process.env.CORS_Origin) {
  throw new Error("CORS_Origin environment variable is required");
}
const allowedOrigins = process.env.CORS_Origin.split(',');

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Security HTTP headers
app.use(helmet());

// Request logging
app.use(morgan("dev"));

// Body parsers with size limits
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// Static files
app.use(express.static("public"));

// Cookie parsing
app.use(cookieParser());
// Basic rate limiter for API to prevent abuse
app.use("/api", apiLimiter);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});
import userRouter from "./routes/auth.routes.js";
import locationRouter from "./routes/location.routes.js"
import postRouter from "./routes/post.routes.js";
app.use("/api/auth", userRouter);
app.use("/api/location",locationRouter);
app.use("/api/posts",postRouter);
 app.use(errorHandler)
export default app;
