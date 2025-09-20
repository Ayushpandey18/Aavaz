import {Router} from "express"
import verifyJWT from "../middlewares/Auth.middleware.js";
import { getHomeLocation, updateHomeLocation } from "../controllers/loaction.controller.js";
const locationRouter=Router();
import { uploadSingle } from "../middlewares/multer.middleware.js";
locationRouter.route("/updatelocation").post( verifyJWT, updateHomeLocation);
locationRouter.route("/gethomelocation").get(verifyJWT,getHomeLocation);
 export default locationRouter;