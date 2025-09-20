import asyncHandler from "../Utils/asyncHandler.js";
import apierror from "../Utils/apierror.js";
import { apiresponse } from "../Utils/apiresponse.js";
import redis from "../Utils/redisclient.js";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper to generate 6-digit OTP
function generateOtp(length = 6) {
  return Math.floor(100000 + Math.random() * 900000)
    .toString()
    .substring(0, length);
}

/**
 * @route   POST /auth/send-otp
 * @desc    Send OTP to user's phone number
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    throw new apierror("Phone number is required", 400);
  }

  // Generate OTP
  const otp = generateOtp(6);

  // Save in Redis with TTL = 5 minutes
  await redis.setex(`otp:${phoneNumber}`, 300, otp);

  // Send OTP via Twilio SMS
  try {
    await twilioClient.messages.create({
      body: `Your Aavaz code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  } catch (err) {
    throw new apierror("Failed to send OTP via SMS", 500, [err.message]);
  }

  return res
    .status(200)
    .json(new apiresponse(200, "OTP sent successfully", { phoneNumber }));
});

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify OTP for phone number
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    throw new apierror("Phone number and OTP are required", 400);
  }

  const storedOtp = await redis.get(`otp:${phoneNumber}`);

  if (!storedOtp) {
    throw new apierror("OTP expired or not found", 400);
  }

  if (storedOtp !== otp) {
    throw new apierror("Invalid OTP", 400);
  }

  // OTP valid → delete it (single-use)
  await redis.del(`otp:${phoneNumber}`);

  return res
    .status(200)
    .json(new apiresponse(200, "OTP verified successfully", { phoneNumber }));
});
