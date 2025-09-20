import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Allow max 5 login attempts in 15 minutes per phone number (or IP)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // max attempts
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // prioritize phoneNumber, else fall back to IP
    return req.body.phoneNumber || ipKeyGenerator(req);
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      message: "Too many login attempts. Please try again after 15 minutes.",
    });
  },
});
