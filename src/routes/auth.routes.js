import {Router} from "express"
import verifyJWT from "../middlewares/Auth.middleware.js";
import { registerUser,loginUser, refreshAccessToken,logoutUser, changeCurrentPassword, verifyOtpAndResetPassword, updateProfile, getCurrentUser,getUserProfile } from "../controllers/auth.controller.js";
import { sendOtp } from "../controllers/otp.controller.js";
const userRouter=Router();
import { uploadSingle } from "../middlewares/multer.middleware.js";
import { otpRateLimiter } from "../middlewares/otpRateimiter.js";
import { loginRateLimiter } from "../middlewares/loginRatelimiter.js";

userRouter.route("/register").post( uploadSingle("avatar"), registerUser);
userRouter.route("/sendOtp").post(otpRateLimiter,sendOtp); 
userRouter.route("/login").post(loginRateLimiter,loginUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/logout").post(verifyJWT,logoutUser);
userRouter.route("/changepassword").post(verifyJWT,changeCurrentPassword); 
userRouter.route("/forgotpassword").post(verifyOtpAndResetPassword);
userRouter.route("/updateprofile").post( verifyJWT,uploadSingle("avatar"), updateProfile);
userRouter.route("/me").get(verifyJWT, getCurrentUser);
 userRouter.route("/users/:username").get(getUserProfile);

 export default userRouter;