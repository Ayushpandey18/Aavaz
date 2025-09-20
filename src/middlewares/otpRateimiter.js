import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Rate limiter: max 1 request per 5 minutes per phone number
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1,                   // limit each key to 1 request per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Use phone number as key if available, otherwise fallback to IPv6-safe IP
    return req.body.phoneNumber || ipKeyGenerator(req);
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      message: "OTP already sent. Please wait 5 minutes before requesting again.",
    });
  },
});
