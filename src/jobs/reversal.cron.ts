import cron from "node-cron";
import { ReversalService } from "../services/reversal.service";

/**
 * Process transactions (shared logic for both immediate and scheduled runs)
 */
const runProcessTransactions = async () => {
  console.log("\n--- [CRON] Checking for Reversals ---");

  try {
    await ReversalService.processTransactions();
  } catch (error) {
    console.error("[ERROR] Cron Job Failed", error);
  }
};

/**
 * Start the reversal bot: run processTransactions immediately, then every 10 seconds.
 * Errors are logged; next run continues on the next tick.
 */
export const startCronJobs = () => {
  console.log(
    "[CRON] Cron Scheduler: ACTIVATED (Running immediately, then every 5s for faster pain.007 detection)",
  );

  // Run immediately on startup (don't wait for first cron tick)
  runProcessTransactions().catch((error) => {
    console.error("[ERROR] Initial run failed:", error);
  });

  // Schedule to run every 5 seconds for faster pain.007 detection
  // (6-field format: second minute hour day month dayOfWeek)
  cron.schedule("*/5 * * * * *", runProcessTransactions);
};
