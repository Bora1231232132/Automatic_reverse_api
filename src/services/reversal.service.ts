import { BakongService } from "./bakong.service";
import { parseBakongXML, extractXmlFromSoap } from "../utils/xml-parser";
import { TransactionModel } from "../models/transaction.model";

export const ReversalService = {
  /**
   * Main loop: fetch incoming transactions for each payee, parse XML, detect reversals,
   * then for each reversal: save PENDING → ack → forward to NBCHQ → update SUCCESS.
   */
  async processTransactions() {
    console.log("🔄 Step 1: Asking Bank for new transactions...");

    const payeeCodesStr =
      process.env.BAKONG_PAYEE_CODES ||
      process.env.BAKONG_PAYEE_CODE ||
      "TOURKHPPXXX";
    const payeeCodes = payeeCodesStr.split(",").map((code) => code.trim());

    console.log(
      `👀 Monitoring ${payeeCodes.length} payee code(s): ${payeeCodes.join(
        ", ",
      )}`,
    );

    const allXmlDocuments: string[] = [];

    for (const payeeCode of payeeCodes) {
      try {
        console.log(`\n📥 Fetching transactions for ${payeeCode}...`);

        const soapResponse =
          await BakongService.getIncomingTransactions(payeeCode);

        const innerXml = extractXmlFromSoap(soapResponse);

        if (!innerXml) {
          console.log(`   ⏹️  No transaction data for ${payeeCode}`);
          continue;
        }

        console.log(
          `   📝 RAW XML from ${payeeCode}:`,
          innerXml.substring(0, 300) + "...",
        );

        /** NBC may return several XML docs in one response; split by "<?xml version" */
        const parts = innerXml.split("<?xml version");

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.length > 0) {
            allXmlDocuments.push("<?xml version" + part);
          }
        }

        console.log(
          `   ✅ Found ${parts.length - 1} transaction(s) for ${payeeCode}`,
        );
      } catch (error) {
        console.error(
          `   ❌ Error fetching transactions for ${payeeCode}:`,
          error,
        );
      }
    }

    if (allXmlDocuments.length === 0) {
      console.log("\n⏹️  No transactions found from any monitored account.");
      return;
    }

    console.log(
      `\n📋 Total transactions to process: ${allXmlDocuments.length}`,
    );

    let reversalsFound = 0;
    let alreadyProcessed = 0;
    let newReversals = 0;
    let failedTransactions = 0;

    for (const xmlDoc of allXmlDocuments) {
      try {
        const result = await this.processSingleTransaction(xmlDoc);
        if (result?.isReversal) {
          reversalsFound++;
          if (result?.alreadyProcessed) {
            alreadyProcessed++;
          } else if (result?.processed) {
            newReversals++;
          } else {
            // Reversal detected but processing failed
            failedTransactions++;
          }
        }
      } catch (error) {
        console.error("❌ Error processing transaction:", error);
        failedTransactions++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 TRANSACTION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Monitored Accounts: ${payeeCodes.join(", ")}`);
    console.log(`New Reversals Detected: ${newReversals + failedTransactions}`);
    console.log(`Successfully Forwarded to NBCHQ: ${newReversals}`);
    if (failedTransactions > 0) {
      console.log(`Failed: ${failedTransactions}`);
    }
    console.log("=".repeat(60) + "\n");
  },

  /**
   * Process one transaction XML: parse, detect reversal (keyword/direction/content pairing),
   * avoid duplicates, optionally verify hash via Open API, then save PENDING → ack → forward → SUCCESS.
   */
  async processSingleTransaction(
    rawXml: string,
  ): Promise<
    | { isReversal: boolean; alreadyProcessed?: boolean; processed?: boolean }
    | undefined
  > {
    const data = parseBakongXML(rawXml);

    if (!data.trxHash) {
      return { isReversal: false };
    }

    /** Content pairing: treat as reversal if we find a stored original with swapped debtor/creditor */
    let matchedOriginal: any = null;
    if (!data.isReversal && data.debtorBic && data.creditorBic) {
      matchedOriginal = await TransactionModel.findMatchingOriginal({
        amount: data.amount,
        currency: data.currency,
        debtorBic: data.creditorBic, // Swapped: Original's creditor = Current's debtor
        creditorBic: data.debtorBic, // Swapped: Original's debtor = Current's creditor
        debtorAccount: data.creditorAccount,
        creditorAccount: data.debtorAccount,
      });

      if (matchedOriginal) {
        console.log(
          `🔗 CONTENT PAIRING: Transaction matched with original ID ${matchedOriginal.id}`,
        );
        console.log(
          `   Original: ${matchedOriginal.debtor_bic} → ${matchedOriginal.creditor_bic}`,
        );
        console.log(`   Current:  ${data.debtorBic} → ${data.creditorBic}`);
        data.isReversal = true; // Mark as reversal based on content match
      }
    }

    // Filter: If it's not a reversal, store as original and stop
    if (!data.isReversal) {
      // Store this as an original transaction for future pairing
      if (data.debtorBic && data.creditorBic) {
        try {
          await TransactionModel.storeOriginal(
            data.trxHash,
            data.amount,
            data.currency,
            data.debtorBic,
            data.creditorBic,
            data.debtorAccount,
            data.creditorAccount,
            data.extRef,
          );
          console.log(
            `📝 Stored original transaction for future pairing: ${data.trxHash}`,
          );
        } catch (err) {
          /* Ignore duplicate (already stored) */
        }
      }
      return { isReversal: false };
    }

    /** Link reversal to original if we can find one (for original_trx_id) */
    if (!matchedOriginal && data.debtorBic && data.creditorBic) {
      matchedOriginal = await TransactionModel.findMatchingOriginal({
        amount: data.amount,
        currency: data.currency,
        debtorBic: data.creditorBic,
        creditorBic: data.debtorBic,
        debtorAccount: data.creditorAccount,
        creditorAccount: data.debtorAccount,
      });
      if (matchedOriginal) {
        console.log(
          `🔗 LINK: Reversal linked to original transaction ID ${matchedOriginal.id}`,
        );
      }
    }

    /** Skip if already processed successfully */
    const existing = await TransactionModel.getByHash(data.trxHash);
    if (existing?.status === "SUCCESS") {
      return { isReversal: true, alreadyProcessed: true };
    }

    console.log("\n" + "=".repeat(60));
    console.log("🆕 NEW REVERSAL DETECTED!");
    console.log("=".repeat(60));
    console.log("📝 Transaction XML:", rawXml.substring(0, 800) + "...");
    console.log(
      `📄 Step 2: Parsed Data. Hash: ${data.trxHash} | Reversal? ${data.isReversal}`,
    );
    console.log(`💰 Amount: ${data.amount} ${data.currency}`);
    console.log(
      `🔑 Original MsgId: ${data.originalMsgId ?? "(not available)"}`,
    );
    console.log(
      `🔑 Original PmtInfId: ${data.originalPmtInfId ?? "(not available)"}`,
    );
    console.log("=".repeat(60) + "\n");

    /** If hash looks like a 64-char blockchain hash, verify it via Bakong Open API */
    const isBlockchainHash = /^[a-f0-9]{64}$/.test(data.trxHash);
    let hashVerified = false;

    if (isBlockchainHash) {
      console.log(
        `🔎 Step 3.5: Verifying hash ${data.trxHash} with Bakong Open API...`,
      );
      try {
        const apiCheck = await BakongService.checkTransactionByHash(
          data.trxHash,
        );

        if (apiCheck?.responseCode !== 0) {
          console.error(
            `❌ [DEBUG] Validation Failed: Bakong API says this hash is invalid.`,
            {
              responseCode: apiCheck?.responseCode,
              responseMessage: apiCheck?.responseMessage,
              fullResponse: apiCheck,
            },
          );
          return { isReversal: true, processed: false };
        }
        console.log("✅ Verified! Transaction exists and is valid.");
        hashVerified = true;
      } catch (error) {
        console.warn(
          "⚠️ Bakong Open API is unavailable. Proceeding without hash verification.",
          error instanceof Error ? error.message : String(error),
        );
        console.log(
          "   ℹ️ Transaction will be processed based on SOAP data only.",
        );
        // Allow processing to continue even if API is down
        hashVerified = true;
      }
    } else {
      console.log(
        `🔎 Step 3.5: Skipping REST verification (not a 64-char blockchain hash, e.g. direction-based refund). ID: ${data.trxHash}`,
      );
      // For non-blockchain hashes, we consider them verified by default
      hashVerified = true;
    }

    // Only proceed if hash is verified (success status)
    if (!hashVerified) {
      console.log(`❌ Hash verification failed. Not storing in DB.`);
      return { isReversal: true, processed: false };
    }

    const nbchqBic = process.env.BAKONG_NBCHQ_BIC || "NBHQKHPPXXX";
    const nbchqAccount = process.env.BAKONG_NBCHQ_ACCOUNT;

    if (!nbchqAccount) {
      console.error(
        "❌ [DEBUG] Cannot forward to NBCHQ: Missing BAKONG_NBCHQ_ACCOUNT environment variable.",
        {
          trxHash: data.trxHash,
          amount: data.amount,
          currency: data.currency,
        },
      );
      return { isReversal: true, processed: false };
    }

    // Step 4: Call makeAcknowledgement FIRST before sending to NBCHQ
    console.log(
      `📩 Step 4: Calling makeAcknowledgement for ${data.trxHash}...`,
    );
    const ackResult = await BakongService.makeAcknowledgement(
      data.originalMsgId || data.trxHash,
      data.originalPmtInfId || data.extRef || "UNKNOWN",
      data.amount,
      data.currency,
      data.debtorBic || process.env.BAKONG_DEBTOR_BIC || "TOURKHPPXXX",
      data.creditorBic || process.env.BAKONG_CREDITOR_BIC || "BKRTKHPPXXX",
    );

    if (!ackResult.success) {
      console.error(
        `❌ makeAcknowledgement failed for ${data.trxHash}. Not forwarding to NBCHQ.`,
        ackResult.error,
      );
      return { isReversal: true, processed: false };
    }
    console.log(`✅ makeAcknowledgement succeeded for ${data.trxHash}`);

    // Step 5: Forward to NBCHQ (only after acknowledgement succeeds)
    console.log(
      `🔄 Step 5: Forwarding reversal to NBCHQ: ${data.amount} ${data.currency} to ${nbchqBic} (${nbchqAccount})`,
      `\n   Original MsgId: ${data.originalMsgId ?? "(not available)"}`,
      `\n   Original PmtInfId: ${data.originalPmtInfId ?? "(not available)"}`,
      `\n   Transaction Hash: ${data.trxHash}`,
    );

    try {
      await BakongService.makeFullFundTransfer(
        data.amount,
        data.currency,
        nbchqBic,
        nbchqAccount,
      );
      console.log("🚀 Forwarded Transaction Sent to NBCHQ.");
    } catch (sendErr) {
      console.error(
        "❌ [DEBUG] Failed to forward transaction to NBCHQ.",
        sendErr,
      );
      return { isReversal: true, processed: false };
    }

    // Step 6: Only save to DB with SUCCESS status after all steps complete
    // Hash was verified + Acknowledgement succeeded + NBCHQ forward succeeded
    try {
      // Check if already exists (retry case)
      const existing = await TransactionModel.getByHash(data.trxHash);

      if (existing) {
        // Update existing record to SUCCESS
        await TransactionModel.updateStatus(data.trxHash, "SUCCESS");
        console.log("💾 Step 6: Status updated to SUCCESS. Cycle Complete.");
      } else {
        // Create new record with SUCCESS status directly
        await TransactionModel.create(
          data.trxHash,
          data.amount,
          data.currency,
          "SUCCESS",
          {
            debtorBic: data.debtorBic,
            creditorBic: data.creditorBic,
            debtorAccount: data.debtorAccount,
            creditorAccount: data.creditorAccount,
            extRef: data.extRef,
            isReversal: true,
            originalTrxId: matchedOriginal?.id || undefined,
          },
        );
        console.log("💾 Step 6: Saved with SUCCESS status. Cycle Complete.");
        if (matchedOriginal) {
          console.log(
            `   Linked to original transaction ID: ${matchedOriginal.id}`,
          );
        }
      }

      return { isReversal: true, processed: true };
    } catch (dbErr) {
      console.error("❌ [DEBUG] Failed to save to database.", {
        trxHash: data.trxHash,
        error: dbErr,
      });
      return { isReversal: true, processed: false };
    }
  },
};
