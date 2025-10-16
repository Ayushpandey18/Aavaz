import connect_db from "./DB/index.js";
import dotenv from 'dotenv';
import app from "./app.js";
import { startLikeSyncWorker } from "./workers/likeSync.worker.js";

dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 7000;

connect_db()
  .then(() => {
    console.log("Connected to database");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
      startLikeSyncWorker();
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Optional: Exit process on DB connection failure
  });
