import { BakongService, ReportTransaction } from "./bakong.service";
import { TransactionModel } from "../models/transaction.model";

export const ReversalService = {
  /**
   * Main loop: fetch incoming transactions from Report API, detect reversals using 
   * transactionContent.revers flag, forward to NBCHQ, and store trxHash in DB.
   */
  async processTransactions() {
    const pollTime = new Date().toISOString();
    console.log(`[INFO] Polling Report API for reversals... [${pollTime}]`);

    try {
      // Fetch transactions from Report API
      const reportData = await BakongService.getIncomingTransactionsFromReportAPI(0, 10);

      if (!reportData || !reportData.content || !Array.isArray(reportData.content)) {
        console.log("   [INFO] No transactions returned from Report API");
        return;
      }

      console.log(`   [INFO] Found ${reportData.content.length} total transaction(s)`);

      // Filter for reversals using transactionContent.revers flag
      const reversals = reportData.content.filter(
        (tx) => tx.transactionContent?.revers === true
      );

      if (reversals.length === 0) {
        console.log("   [INFO] No reversal transactions detected");
        return;
      }

      console.log(`   [INFO] Detected ${reversals.length} reversal transaction(s)`);

      let newReversals = 0;
      let alreadyProcessed = 0;
      let failedTransactions = 0;

      // Process each reversal
      for (const reversal of reversals) {
        try {
          const result = await this.processReversalTransaction(reversal);
          
          if (result.alreadyProcessed) {
            alreadyProcessed++;
            console.log(`   [SKIP] Already processed: ${reversal.transactionContent?.trxHash}`);
          } else if (result.processed) {
            newReversals++;
            console.log(`   [SUCCESS] Successfully processed reversal`);
          } else {
            failedTransactions++;
            console.log(`   [ERROR] Reversal processing failed`);
          }
        } catch (error) {
          console.error("[ERROR] Error processing reversal:", error);
          failedTransactions++;
        }
      }

      // Summary
      console.log("\n" + "=".repeat(60));
      console.log("TRANSACTION SUMMARY");
      console.log("=".repeat(60));
      console.log(`Total Transactions: ${reportData.content.length}`);
      console.log(`Reversals Detected: ${reversals.length}`);
      console.log(`Already Processed: ${alreadyProcessed}`);
      console.log(`New Reversals Forwarded to NBCHQ: ${newReversals}`);
      if (failedTransactions > 0) {
        console.log(`Failed: ${failedTransactions}`);
      }
      console.log("=".repeat(60) + "\n");

    } catch (error) {
      console.error("[ERROR] Failed to poll Report API:", error);
    }
  },

  /**
   * Process a single reversal transaction from Report API.
   * Validates it's a true reversal, checks for duplicates, forwards to NBCHQ, and stores in DB.
   */
  async processReversalTransaction(
    tx: ReportTransaction
  ): Promise<{ alreadyProcessed: boolean; processed: boolean }> {
    const trxHash = tx.transactionContent?.trxHash;

    if (!trxHash) {
      console.log("   [WARN] Warning: Reversal missing trxHash, skipping");
      return { alreadyProcessed: false, processed: false };
    }

    // Validate this is a real reversal
    if (!tx.transactionContent?.revers || !tx.transactionContent?.reversedTrxHash) {
      console.log(`   [WARN] Warning: Transaction ${trxHash} has revers flag but missing reversedTrxHash`);
      return { alreadyProcessed: false, processed: false };
    }

    console.log("\n" + "=".repeat(60));
    console.log("NEW REVERSAL DETECTED!");
    console.log("=".repeat(60));
    console.log(`Transaction Hash: ${trxHash}`);
    console.log(`Amount: ${tx.amount} ${tx.currencyName}`);
    console.log(`Direction: ${tx.sourceBankParticipantCode} -> ${tx.destinationBankParticipantCode}`);
    console.log(`Description: ${tx.description || "(none)"}`);
    console.log(`Reversing Transaction: ${tx.transactionContent.reversedTrxHash}`);
    console.log(`Reversal Flag: ${tx.transactionContent.revers}`);
    console.log("=".repeat(60) + "\n");

    // Check if already processed
    const existing = await TransactionModel.exists(trxHash);
    if (existing) {
      console.log(`   [SKIP] Transaction ${trxHash} already processed (found in DB)`);
      return { alreadyProcessed: true, processed: false };
    }

    // Get NBCHQ destination from environment
    const nbchqBic = process.env.BAKONG_NBCHQ_BIC || "NBCHKHPPXXX";
    const nbchqAccount = process.env.BAKONG_NBCHQ_ACCOUNT;

    if (!nbchqAccount) {
      console.error("[ERROR] Cannot forward to NBCHQ: Missing BAKONG_NBCHQ_ACCOUNT environment variable");
      return { alreadyProcessed: false, processed: false };
    }

    // Forward to NBCHQ
    console.log(
      `[STEP 1] Forwarding reversal to NBCHQ: ${tx.amount} ${tx.currencyName} to ${nbchqBic} (${nbchqAccount})`
    );

    try {
      await BakongService.makeFullFundTransfer(
        tx.amount,
        tx.currencyName,
        nbchqBic,
        nbchqAccount
      );
      console.log("[STEP 2] Forwarded Transaction Sent to NBCHQ.");
    } catch (sendErr) {
      console.error("[ERROR] Failed to forward transaction to NBCHQ:", sendErr);
      return { alreadyProcessed: false, processed: false };
    }

    // Store in database with SUCCESS status
    try {
      await TransactionModel.create(
        trxHash,
        tx.amount,
        tx.currencyName,
        "SUCCESS",
        {
          debtorBic: tx.sourceBankParticipantCode,
          creditorBic: tx.destinationBankParticipantCode,
          debtorAccount: tx.sourceAccountId,
          creditorAccount: tx.destinationAccountId,
          extRef: tx.transactionContent.reversedTrxHash, // Store the original trx hash
          isReversal: true,
        }
      );
      console.log(`[STEP 3] Saved to Database with SUCCESS status. Cycle Complete.`);
      console.log(`   Original transaction: ${tx.transactionContent.reversedTrxHash}`);

      return { alreadyProcessed: false, processed: true };
    } catch (dbErr) {
      console.error("[ERROR] Failed to save to database:", dbErr);
      return { alreadyProcessed: false, processed: false };
    }
  },
};
