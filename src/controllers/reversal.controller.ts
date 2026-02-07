import { Request, Response } from "express";
import { ReversalService } from "../services/reversal.service";

/**
 * Manual trigger endpoint for processing pain.007 reversals
 * Use this when you know a reversal was sent but bot didn't auto-detect it
 */
export async function triggerReversalCheck(req: Request, res: Response) {
  try {
    console.log("🔔 Manual reversal check triggered via API");

    await ReversalService.processTransactions();

    res.json({
      success: true,
      message: "Reversal check completed",
    });
  } catch (error) {
    console.error("[ERROR] Error in manual reversal check:", error);
    res.status(500).json({
      success: false,
      error: String(error),
    });
  }
}

/**
 * Force process/refresh - triggers a manual check of Report API
 * Note: Since we're using Report API now, we can't process arbitrary XML.
 * This endpoint just triggers a fresh poll of the API.
 */
export async function forceProcessReversal(req: Request, res: Response) {
  try {
    console.log(`🔔 Force processing - triggering Report API poll`);

    await ReversalService.processTransactions();

    res.json({
      success: true,
      message: "Report API poll completed",
    });
  } catch (error) {
    console.error("[ERROR] Error force processing:", error);
    res.status(500).json({
      success: false,
      error: String(error),
    });
  }
}
