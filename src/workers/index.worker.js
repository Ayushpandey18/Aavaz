import { feedworker } from "./feedWorker.js";
import { notificationWorker } from "./notification.worker.js";

const ENV = process.env.NODE_ENV || "development";
const VERBOSE = ENV !== "production"; // Only verbose logs in dev

// Keep track of stats
let feedJobsProcessed = 0;
let notifJobsProcessed = 0;

feedworker.on("completed", (job) => {
  feedJobsProcessed++;
  if (VERBOSE) console.log(`📊 Feed job completed: ${job.id}`);
});

feedworker.on("failed", (job, err) => {
  console.error(`❌ Feed job failed: ${job.id}`, err);
});

// ---------------- Notification Worker ----------------
notificationWorker.on("completed", (job) => {
  notifJobsProcessed++;
  if (VERBOSE) console.log(`📨 Notification job completed: ${job.id}`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`❌ Notification job failed: ${job.id}`, err);
});

// ---------------- Periodic Stats ----------------
if (VERBOSE) {
  setInterval(() => {
    console.log(`Stats: Feed=${feedJobsProcessed}, Notification=${notifJobsProcessed}`);
    feedJobsProcessed = 0;
    notifJobsProcessed = 0;
  }, 60000); // every 1 min
}

// ---------------- Graceful Shutdown ----------------
const shutdown = async () => {
  console.log("🛑 Shutting down workers...");
  await feedworker.close();
  await notificationWorker.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("✅ Workers started");
