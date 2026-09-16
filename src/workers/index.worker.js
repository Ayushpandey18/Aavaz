
import { feedworker } from "./feedWorker.js";
import { notificationWorker } from "./notificationworker.js";
import { startLikeSyncWorker } from "./likeSync.worker.js";

const ENV = process.env.NODE_ENV || "development";
const VERBOSE = ENV !== "production";

// --------------------------------------------------
// Start Workers
// --------------------------------------------------

const likeSyncWorker = startLikeSyncWorker();

// --------------------------------------------------
// Keep Track of Stats
// --------------------------------------------------

let feedJobsProcessed = 0;
let notifJobsProcessed = 0;
let likeSyncJobsProcessed = 0;

// --------------------------------------------------
// Feed Worker Events
// --------------------------------------------------

feedworker.on("completed", (job) => {
  feedJobsProcessed++;

  if (VERBOSE) {
    console.log(`📊 Feed job completed: ${job.id}`);
  }
});

feedworker.on("failed", (job, err) => {
  console.error(`❌ Feed job failed: ${job?.id}`, err);
});

// --------------------------------------------------
// Notification Worker Events
// --------------------------------------------------

notificationWorker.on("completed", (job) => {
  notifJobsProcessed++;

  if (VERBOSE) {
    console.log(`📨 Notification job completed: ${job.id}`);
  }
});

notificationWorker.on("failed", (job, err) => {
  console.error(`❌ Notification job failed: ${job?.id}`, err);
});

// --------------------------------------------------
// Like Sync Worker Events
// --------------------------------------------------

if (likeSyncWorker) {
  likeSyncWorker.on("completed", (job) => {
    likeSyncJobsProcessed++;

    if (VERBOSE) {
      console.log(`❤️ Like sync job completed: ${job.id}`);
    }
  });

  likeSyncWorker.on("failed", (job, err) => {
    console.error(`❌ Like sync job failed: ${job?.id}`, err);
  });
}

// --------------------------------------------------
// Periodic Stats
// --------------------------------------------------

if (VERBOSE) {
  setInterval(() => {
    console.log(
      `📈 Stats: Feed=${feedJobsProcessed}, Notification=${notifJobsProcessed}, LikeSync=${likeSyncJobsProcessed}`
    );

    feedJobsProcessed = 0;
    notifJobsProcessed = 0;
    likeSyncJobsProcessed = 0;
  }, 60000);
}

// --------------------------------------------------
// Graceful Shutdown
// --------------------------------------------------

const shutdown = async (signal) => {
  console.log(`🛑 Received ${signal}. Shutting down workers...`);

  try {
    await Promise.all([
      feedworker.close(),
      notificationWorker.close(),
      likeSyncWorker?.close(),
    ]);

    console.log("✅ All workers shut down successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error while shutting down workers:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// --------------------------------------------------
// Worker Startup
// --------------------------------------------------

console.log("✅ Workers started");

