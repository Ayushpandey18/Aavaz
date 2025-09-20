import async_Handler from "../Utils/asyncHandler.js";
import jwt from"jsonwebtoken"
import apierror from "../Utils/apierror.js";
import User from "../models/user.model.js";
const verifyJWT=async_Handler(async(req,_,next)=>{
try {
       const token= req.cookies?.accessToken||req.header("Authorization")?.replace("Bearer ","")
    if(!token){
        throw new apierror("unauthenticated",401)
    }
    const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    const user=await User.findById(decodedToken._id).select("-password -refreshToken")
    if(!user)
        {
            throw new apierror("unauthenticated",401)
        }
        req.user=user;
        next()
} catch (error) {
    throw new apierror("something went wrong",401)
}
})
export default verifyJWT;