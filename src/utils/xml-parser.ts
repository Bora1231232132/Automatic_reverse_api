import { XMLParser } from "fast-xml-parser";

/** Result of parsing a Bakong/NBC transaction XML (reversal or credit transfer) */
export interface ParsedReversal {
  isReversal: boolean;
  isPain007?: boolean; // True if this is an official pain.007 reversal request
  trxHash: string | null;
  amount: number;
  currency: string;
  endToEndId: string;
  msgId: string; // The ID of the message we just received
  pmtInfId: string; // The PmtInfId of the message we just received
  messageType: string; // e.g. pain.001.001.05 or pain.007.001.05
  originalMsgId?: string; // For reversals (pain.007), the original transaction being reversed
  originalPmtInfId?: string;
  debtorAccount?: string | undefined;
  debtorBic?: string;
  creditorBic?: string;
  creditorAccount?: string;
  extRef?: string;
}

/** Parser config: keep attributes (e.g. Ccy="KHR") and use plain names (Ccy, not @_Ccy) */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

/**
 * Pull the inner transaction XML out of the SOAP getIncomingTransaction response.
 * NBC wraps XML in SOAP-ENV:Envelope → Body → getIncomingTransactionResponse → ns2:return.
 */
export const extractXmlFromSoap = (soapResponse: string): string | null => {
  try {
    const jsonObj = parser.parse(soapResponse);

    const returnContent =
      jsonObj?.["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"]?.[
        "ns2:getIncomingTransactionResponse"
      ]?.["ns2:return"];

    if (!returnContent || typeof returnContent !== "string") {
      return null;
    }

    return returnContent;
  } catch (error) {
    console.error("[ERROR] Failed to parse SOAP envelope:", error);
    return null;
  }
};

/**
 * Parse Bakong/NBC transaction XML into a single object.
 * Supports: pain.007 (reversal), pain.001 (credit transfer), FitToFICstmrCdtTrf.
 * Detects reversal by: pain.007 type, "REVERSING" in RmtInf, or BKRT→TOUR direction.
 */
export const parseBakongXML = (rawXml: string): ParsedReversal => {
  let cleanXml = rawXml;

  if (rawXml.includes("<![CDATA[")) {
    const start = rawXml.indexOf("<![CDATA[") + 9;
    const end = rawXml.indexOf("]]>");
    cleanXml = rawXml.substring(start, end);
  }

  const jsonObj = parser.parse(cleanXml);

  /** Path 1: pain.007 Customer Payment Reversal (official reversal format) */
  const reversalData = jsonObj?.Document?.CstmrPmtRvsl;

  if (reversalData) {
    const txInfo = reversalData?.OrgnlPmtInfAndRvsl?.TxInf;
    const orgnlGrpInf = reversalData?.OrgnlGrpInf;
    const orgnlTxRef = txInfo?.OrgnlTxRef;
    const grpHdr = reversalData?.GrpHdr;

    const originalMsgId = orgnlGrpInf?.OrgnlMsgId || "";
    const originalPmtInfId =
      reversalData?.OrgnlPmtInfAndRvsl?.OrgnlPmtInfId || "";
    const currentMsgId = grpHdr?.MsgId || "";
    // Account IDs should be strings, not numbers
    const debtorAccountRaw = orgnlTxRef?.DbtrAcct?.Id?.Othr?.Id;
    const debtorAccount = debtorAccountRaw ? String(debtorAccountRaw) : "";
    const creditorAccountRaw = orgnlTxRef?.CdtrAcct?.Id?.Othr?.Id;
    const creditorAccount = creditorAccountRaw ? String(creditorAccountRaw) : "";
    
    // BIC codes can be in OrgnlTxRef (preferred) or GrpHdr (fallback for pain.007)
    // Normalize BIC codes: "TOURKHPP" -> "TOURKHPPXXX" for matching
    const normalizeBic = (bic: string): string => {
      if (!bic) return "";
      // If BIC doesn't end with XXX and is 8 chars, add XXX
      if (bic.length === 8 && !bic.endsWith("XXX")) {
        return bic + "XXX";
      }
      return bic;
    };
    
    const debtorBicRaw = 
      orgnlTxRef?.DbtrAgt?.FinInstnId?.BICFI || 
      grpHdr?.DbtrAgt?.FinInstnId?.BICFI || 
      "";
    const creditorBicRaw = 
      orgnlTxRef?.CdtrAgt?.FinInstnId?.BICFI || 
      grpHdr?.CdtrAgt?.FinInstnId?.BICFI || 
      "";
    
    const debtorBic = normalizeBic(debtorBicRaw);
    const creditorBic = normalizeBic(creditorBicRaw);
    
    const amount = parseFloat(
      txInfo?.OrgnlInstdAmt?.["#text"] ||
        txInfo?.RvsdInstdAmt?.["#text"] ||
        "0",
    );
    const currency =
      txInfo?.OrgnlInstdAmt?.Ccy || txInfo?.RvsdInstdAmt?.Ccy || "KHR";
    const reversalId = txInfo?.RvslId || "";

    // Use originalMsgId as trxHash, fallback to currentMsgId if empty
    const trxHash = originalMsgId || currentMsgId || reversalId;

    return {
      isReversal: true,
      isPain007: true, // Flag for immediate ACK detection
      trxHash,
      amount,
      currency,
      endToEndId: reversalId,
      msgId: currentMsgId,
      pmtInfId: originalPmtInfId, // For pain.007, often OrgnlPmtInfId is what is used for referencing
      messageType: "pain.007.001.05",
      originalMsgId,
      originalPmtInfId,
      debtorAccount,
      creditorAccount,
      debtorBic,
      creditorBic,
      extRef: originalPmtInfId,
    };
  }

  /** Path 2: pain.001 Credit Transfer or FitToFICstmrCdtTrf (may contain "REVERSING" or BKRT→TOUR) */
  const fiTransfer = jsonObj?.Document?.FitToFICstmrCdtTrf?.CdtTrfTxInf;
  const customerTransferPmtInf = jsonObj?.Document?.CstmrCdtTrfInitn?.PmtInf;
  const customerTransfer = customerTransferPmtInf?.CdtTrfTxInf;

  const txInfo = fiTransfer || customerTransfer;

  /** RmtInf.Ustrd can be one string or an array; normalize to single string */
  let rmtInf = "";
  if (txInfo?.RmtInf?.Ustrd) {
    rmtInf = Array.isArray(txInfo.RmtInf.Ustrd)
      ? txInfo.RmtInf.Ustrd.join(" ")
      : txInfo.RmtInf.Ustrd;
  }

  /** Reversal if "REVERSING" appears in remittance info */
  const isReversal = rmtInf.includes("REVERSING");

  /** Reversal by direction: BKRT (debtor) → TOUR (creditor) = refund */
  let isRefundByDirection = false;
  const debtorBicRaw = customerTransferPmtInf?.DbtrAgt?.FinInstnId?.BICFI ?? "";
  const creditorBicRaw = customerTransfer?.CdtrAgt?.FinInstnId?.BICFI ?? "";
  
  // Normalize BIC codes for comparison (add XXX if missing)
  const normalizeBic = (bic: string): string => {
    if (!bic) return "";
    if (bic.length === 8 && !bic.endsWith("XXX")) {
      return bic + "XXX";
    }
    return bic;
  };
  
  const debtorBic = normalizeBic(debtorBicRaw);
  const creditorBic = normalizeBic(creditorBicRaw);
  
  if (customerTransferPmtInf && customerTransfer) {
    if (debtorBic === "BKRTKHPPXXX" && creditorBic === "TOURKHPPXXX") {
      isRefundByDirection = true;
    }
  }

  const grpHdr = jsonObj?.Document?.CstmrCdtTrfInitn?.GrpHdr;
  const currentMsgId = grpHdr?.MsgId || "";
  const currentPmtInfId = customerTransferPmtInf?.PmtInfId || "";
  
  /** Check if this pain.001 might be a converted pain.007 reversal
   * Look for indicators: references to original transactions, reversal-related fields
   */
  let isConvertedPain007 = false;
  // Check if there are any references that suggest this is a reversal
  // (pain.007 reversals converted to pain.001 might have specific patterns)
  const hasReversalIndicators = 
    rmtInf.toLowerCase().includes("reversal") ||
    rmtInf.toLowerCase().includes("reverse") ||
    rmtInf.toLowerCase().includes("refund") ||
    // Check if PmtInfId or MsgId suggests it's related to a reversal
    (currentPmtInfId && currentPmtInfId.includes("RVSL")) ||
    (currentMsgId && currentMsgId.includes("RVSL"));

  const isReversalOrRefund = isReversal || isRefundByDirection || isConvertedPain007;

  /** Extract 64-char hex hash from "trx_hash:..." in RmtInf (ignores short/fake hashes) */
  const hashMatch = rmtInf.match(/trx_hash:([a-f0-9]{64})/);
  const trxHash = hashMatch?.[1] ?? null;
  const debtorAccount =
    customerTransferPmtInf?.DbtrAcct?.Id?.Othr?.Id || undefined;
  const creditorAccount = customerTransfer?.CdtrAcct?.Id?.Othr?.Id || undefined;

  return {
    isReversal: isReversalOrRefund,
    isPain007: false, // This is pain.001, not pain.007
    trxHash: trxHash || currentMsgId,
    amount: parseFloat(txInfo?.Amt?.InstdAmt?.["#text"] || "0"),
    currency: txInfo?.Amt?.InstdAmt?.Ccy || "USD",
    endToEndId: txInfo?.PmtId?.EndToEndId || "",
    msgId: currentMsgId,
    pmtInfId: currentPmtInfId,
    messageType: "pain.001.001.05",
    originalMsgId: currentMsgId || undefined,
    originalPmtInfId: currentPmtInfId || undefined,
    debtorAccount,
    creditorAccount,
    debtorBic,
    creditorBic,
    extRef: currentPmtInfId || undefined,
  };
};
