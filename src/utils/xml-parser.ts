import { XMLParser } from "fast-xml-parser";

/** Result of parsing a Bakong/NBC transaction XML (reversal or credit transfer) */
export interface ParsedReversal {
  isReversal: boolean;
  trxHash: string | null;
  amount: number;
  currency: string;
  endToEndId: string;
  originalMsgId?: string;
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
    console.error("❌ Failed to parse SOAP envelope:", error);
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

    const originalMsgId = orgnlGrpInf?.OrgnlMsgId || "";
    const originalPmtInfId =
      reversalData?.OrgnlPmtInfAndRvsl?.OrgnlPmtInfId || "";
    const debtorAccount = orgnlTxRef?.DbtrAcct?.Id?.Othr?.Id || "";
    const creditorAccount = orgnlTxRef?.CdtrAcct?.Id?.Othr?.Id || "";
    const debtorBic = orgnlTxRef?.DbtrAgt?.FinInstnId?.BICFI || "";
    const creditorBic = orgnlTxRef?.CdtrAgt?.FinInstnId?.BICFI || "";
    const amount = parseFloat(
      txInfo?.OrgnlInstdAmt?.["#text"] ||
        txInfo?.RvsdInstdAmt?.["#text"] ||
        "0",
    );
    const currency =
      txInfo?.OrgnlInstdAmt?.Ccy || txInfo?.RvsdInstdAmt?.Ccy || "KHR";
    const reversalId = txInfo?.RvslId || "";

    return {
      isReversal: true,
      trxHash: originalMsgId,
      amount,
      currency,
      endToEndId: reversalId,
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

  if (jsonObj?.Document?.CstmrCdtTrfInitn) {
    const debtorBic = customerTransferPmtInf?.DbtrAgt?.FinInstnId?.BICFI;
    const creditorBic = customerTransfer?.CdtrAgt?.FinInstnId?.BICFI;
  } else if (jsonObj?.Document?.FitToFICstmrCdtTrf) {
    /* FI transfer path */
  }

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
  const debtorBic = customerTransferPmtInf?.DbtrAgt?.FinInstnId?.BICFI ?? "";
  const creditorBic = customerTransfer?.CdtrAgt?.FinInstnId?.BICFI ?? "";
  if (customerTransferPmtInf && customerTransfer) {
    if (debtorBic === "BKRTKHPPXXX" && creditorBic === "TOURKHPPXXX") {
      isRefundByDirection = true;
    }
  }

  const isReversalOrRefund = isReversal || isRefundByDirection;

  /** Extract 64-char hex hash from "trx_hash:..." in RmtInf (ignores short/fake hashes) */
  const hashMatch = rmtInf.match(/trx_hash:([a-f0-9]{64})/);
  const trxHash = hashMatch?.[1] ?? null;

  const grpHdr = jsonObj?.Document?.CstmrCdtTrfInitn?.GrpHdr;
  const originalMsgId = grpHdr?.MsgId || null;
  const originalPmtInfId = customerTransferPmtInf?.PmtInfId || null;
  const debtorAccount =
    customerTransferPmtInf?.DbtrAcct?.Id?.Othr?.Id || undefined;
  const creditorAccount = customerTransfer?.CdtrAcct?.Id?.Othr?.Id || undefined;

  return {
    isReversal: isReversalOrRefund,
    trxHash: trxHash || originalMsgId,
    amount: parseFloat(txInfo?.Amt?.InstdAmt?.["#text"] || "0"),
    currency: txInfo?.Amt?.InstdAmt?.Ccy || "USD",
    endToEndId: txInfo?.PmtId?.EndToEndId || "",
    originalMsgId: originalMsgId || undefined,
    originalPmtInfId: originalPmtInfId || undefined,
    debtorAccount:
      debtorAccount ||
      customerTransferPmtInf?.DbtrAcct?.Id?.Othr?.Id ||
      undefined,
    creditorAccount,
    debtorBic,
    creditorBic,
    extRef: originalPmtInfId || undefined,
  };
};
