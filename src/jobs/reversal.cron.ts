import cron from "node-cron";
import { ReversalService } from "../services/reversal.service";

/**
 * Start the reversal bot: run processTransactions every minute.
 * Errors are logged; next run continues on the next tick.
 */
export const startCronJobs = () => {
  console.log("⏰ Cron Scheduler: ACTIVATED (Running every 60s)");

  cron.schedule("* * * * *", async () => {
    console.log("\n--- ⏰ Cron Triggered: Checking for Reversals ---");

    try {
      await ReversalService.processTransactions();
    } catch (error) {
      console.error("❌ Cron Job Failed", error);
    }
  });
};
