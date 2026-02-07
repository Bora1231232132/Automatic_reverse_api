import { postRequest } from "../utils/http-client";
import { sendSoapRequest, SoapFaultError } from "../utils/soap-client";
import { AuthService } from "./auth.service";
import dotenv from "dotenv";

dotenv.config();

export interface BakongTransactionResponse {
  responseCode: number;
  responseMessage: string;
  data?: any;
}

export interface HistoryTransaction {
  id?: string;
  msgId?: string;
  messageType?: string;
  amount?: number;
  currency?: string;
  debtorBic?: string;
  creditorBic?: string;
  status?: string;
  createdAt?: string;
  rawXml?: string;
}

/**
 * Report API Transaction Response (from /report-service/api/transfer-management/iroha-transactions/incoming)
 */
export interface ReportTransaction {
  fiTransactionId: number;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceName: string;
  destinationName: string;
  sourceBankParticipantCode: string;
  sourceBankName: string;
  destinationBankParticipantCode: string;
  destinationBankName: string;
  amount: number;
  currencyName: string;
  transactionCreatedTime: number;
  status: string;
  transactionHash: string;
  description: string | null;
  transactionContent: {
    trxHash: string;
    date: number;
    commandList: Array<{
      commandCase: string;
      srcAccountId: string;
      dstAccountId: string;
      amount: number;
      assetId: string;
      description: string;
    }>;
    details: {
      senderName: string;
      receiverName: string;
      senderPartcode: string;
      receiverPartcode: string;
    };
    revers: boolean;
    reversedTrxHash: string | null;
    transferType: string;
    creatorAccountId: string;
  } | null;
}

/**
 * Actual API response structure from NBC Report Service
 */
export interface ReportAPIResponse {
  status: {
    code: number;
    errorCode: string | null;
    error: string | null;
    warning: string | null;
  };
  data: ReportTransaction[];
}

/**
 * Normalized response for internal use
 */
export interface NormalizedReportResponse {
  content: ReportTransaction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const BakongService = {
  /**
   * Verify a transaction exists via Bakong Open API (REST).
   * Used to validate 64-char blockchain hashes before forwarding.
   */
  async checkTransactionByHash(
    hash: string,
  ): Promise<BakongTransactionResponse> {
    return await postRequest<BakongTransactionResponse>(
      "/check_transaction_by_hash",
      {
        hash: hash,
      },
    );
  },

  /**
   * Fetch incoming transactions for one payee via SOAP getIncomingTransaction.
   * Returns raw SOAP response; use extractXmlFromSoap + parseBakongXML to get per-tx data.
   */
  async getIncomingTransactions(payeeCode?: string): Promise<string> {
    const effectivePayeeCode =
      payeeCode || process.env.BAKONG_PAYEE_CODE || "NBCOKHPPXXX";
    const transactionSize = process.env.BAKONG_TRANSACTION_SIZE || "200";

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
         <soapenv:Header/>
         <soapenv:Body>
            <web:getIncomingTransaction>
               <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
               <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
               <web:payee_participant_code>${effectivePayeeCode}</web:payee_participant_code>
               <web:size>${transactionSize}</web:size>
            </web:getIncomingTransaction>
         </soapenv:Body>
      </soapenv:Envelope>`;

    return await sendSoapRequest(soapBody);
  },

  /**
   * Fetch transaction history from NBC's history API.
   * This shows ALL transactions including auto-acknowledged pain.007 reversals.
   * Used as a fallback when getIncomingTransactions returns empty.
   */
  async getTransactionHistory(): Promise<HistoryTransaction[]> {
    const historyUrl =
      process.env.BAKONG_HISTORY_URL || "http://10.20.6.228/history";

    try {
      const axios = (await import("axios")).default;
      const response = await axios.get(historyUrl, {
        timeout: 10000,
        headers: {
          Accept: "application/json, text/html, */*",
        },
      });

      console.log(`   📜 History API response type: ${typeof response.data}`);

      // Handle different response formats
      if (Array.isArray(response.data)) {
        // JSON array response
        return response.data as HistoryTransaction[];
      } else if (
        typeof response.data === "object" &&
        response.data.transactions
      ) {
        // JSON object with transactions array
        return response.data.transactions as HistoryTransaction[];
      } else if (typeof response.data === "string") {
        // HTML or XML response - need to parse
        console.log(
          `   [INFO] History response preview: ${response.data.substring(0, 500)}...`,
        );

        // Try to extract transaction data from HTML/XML
        // For now, return empty and log for debugging
        console.log("   [WARN] History returned HTML/XML - manual parsing needed");
        return [];
      }

      return [];
    } catch (error) {
      console.error("   [ERROR] Failed to fetch transaction history:", error);
      return [];
    }
  },

  /**
   * Fetch incoming transactions from NBC's Report Service API.
   * Uses JWT authentication with automatic token refresh on 401.
   *
   * API endpoint: /report-service/api/transfer-management/iroha-transactions/incoming
   * Returns: Paginated list with transaction details including transactionContent with revers flag
   */
  async getIncomingTransactionsFromReportAPI(
    page: number = 0,
    size: number = 10,
    retryCount: number = 0,
  ): Promise<NormalizedReportResponse | null> {
    const reportApiUrl =
      process.env.BAKONG_REPORT_API_URL || "http://10.20.6.228/report-service";
    const endpoint = `${reportApiUrl}/api/transfer-management/iroha-transactions/incoming`;

    try {
      const axios = (await import("axios")).default;

      // Get JWT token from AuthService
      const token = await AuthService.getToken();

      // Build headers with Bearer token
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Try empty body first (as per user's curl example)
      const requestBody = {};

      console.log(`   [INFO] Fetching Report API: POST ${endpoint}`);
      console.log(`   [INFO] Using token: ${token.substring(0, 30)}...${token.substring(token.length - 20)}`);

      // Send POST request with pagination params
      const response = await axios.post(endpoint, requestBody, {
        params: {
          page,
          size,
          sort: "transactionCreatedTime,desc",
          type: "ALL",
        },
        timeout: 15000,
        headers,
      });

      // Parse the actual API response structure: {status: {...}, data: [...]}
      const apiResponse = response.data as ReportAPIResponse;
      
      // Check for API-level errors
      if (apiResponse.status?.code !== 0) {
        console.error(`   [ERROR] API Error: ${apiResponse.status?.error || "Unknown error"}`);
        return null;
      }

      const transactions = apiResponse.data || [];
      const transactionCount = transactions.length;
      
      console.log(
        `   [INFO] Report API returned ${transactionCount} transactions (page ${page})`,
      );

      // Normalize to expected format
      return {
        content: transactions,
        totalElements: transactions.length,
        totalPages: transactions.length > 0 ? 1 : 0,
        size: size,
        number: page,
      };
    } catch (error: any) {
      // Handle 401 Unauthorized - invalidate token and retry once
      if (error.response?.status === 401 && retryCount === 0) {
        console.log(
          `   [INFO] Token expired (401), refreshing and retrying...`,
        );
        AuthService.invalidateToken();
        return this.getIncomingTransactionsFromReportAPI(page, size, retryCount + 1);
      }

      if (error.response?.status === 401) {
        console.error(
          `   [ERROR] Authentication failed (401) even after retry`,
        );
      } else if (error.response?.status === 500) {
        console.error(`   [ERROR] Server Error (500) from Report API`);
        console.error(
          `      Response: ${JSON.stringify(error.response?.data || {}).substring(0, 300)}`,
        );
      } else {
        console.error(`   [ERROR] Failed to fetch from Report API:`, error.message);
        if (error.response) {
          console.error(`      Status: ${error.response.status}`);
          console.error(
            `      Response: ${JSON.stringify(error.response?.data || {}).substring(0, 200)}`,
          );
        }
      }
      return null;
    }
  },

  /**
   * Send acknowledgement to NBC via SOAP makeAcknowledgement to confirm receipt.
   * Must succeed BEFORE we forward to NBCHQ.
   * Uses ISO 20022 pain.002.001.06 (Customer Payment Status Report).
   */
  async makeAcknowledgement(
    originalMsgId: string,
    originalPmtInfId: string,
    amount: number,
    currency: string,
    debtorBic: string,
    creditorBic: string,
    messageType: string = "pain.001.001.05",
  ): Promise<{
    success: boolean;
    response?: string;
    error?: any;
    alreadyAcknowledged?: boolean;
  }> {
    console.log(
      `   [INFO] Sending makeAcknowledgement for ${originalMsgId} (${messageType})...`,
    );

    const now = new Date();
    const timestamp = now.getTime();
    const msgId = `ACK${creditorBic}${timestamp}`; // Prefix with the one acknowledging
    const createDateTime = now.toISOString();

    // Generate pain.002.001.06 Customer Payment Status Report
    const pain002Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document xsi:schemaLocation="jaxb/iso20022/pain.002.001.06.xsd" xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.06" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <CstmrPmtStsRpt>
      <GrpHdr>
         <MsgId>${msgId}</MsgId>
         <CreDtTm>${createDateTime}</CreDtTm>
         <InitgPty>
            <Nm>${creditorBic}</Nm>
         </InitgPty>
         <DbtrAgt>
            <FinInstnId>
               <BICFI>${debtorBic}</BICFI>
            </FinInstnId>
         </DbtrAgt>
         <CdtrAgt>
            <FinInstnId>
               <BICFI>${creditorBic}</BICFI>
            </FinInstnId>
         </CdtrAgt>
      </GrpHdr>
      <OrgnlGrpInfAndSts>
         <OrgnlMsgId>${originalMsgId}</OrgnlMsgId>
         <OrgnlMsgNmId>${messageType}</OrgnlMsgNmId>
         <OrgnlCreDtTm>${createDateTime}</OrgnlCreDtTm>
      </OrgnlGrpInfAndSts>
      <OrgnlPmtInfAndSts>
         <OrgnlPmtInfId>${originalPmtInfId}</OrgnlPmtInfId>
         <TxInfAndSts>
            <TxSts>ACSC</TxSts>
            <OrgnlTxRef>
               <Amt>
                  <InstdAmt Ccy="${currency}">${amount}</InstdAmt>
               </Amt>
               <Dbtr>
                  <Nm>${debtorBic}</Nm>
               </Dbtr>
               <Cdtr>
                  <Nm>${creditorBic}</Nm>
               </Cdtr>
            </OrgnlTxRef>
         </TxInfAndSts>
      </OrgnlPmtInfAndSts>
   </CstmrPmtStsRpt>
</Document>`;

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
         <soapenv:Header/>
         <soapenv:Body>
            <web:makeAcknowledgement>
               <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
               <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
               <web:content_message><![CDATA[${pain002Xml}]]></web:content_message>
            </web:makeAcknowledgement>
         </soapenv:Body>
      </soapenv:Envelope>`;

    try {
      const response = await sendSoapRequest(soapBody);
      console.log(`   [SUCCESS] Acknowledgement successful for ${originalMsgId}`);
      return { success: true, response };
    } catch (error) {
      // Handle TRANSACTION_NOT_FOUND as already acknowledged (non-fatal)
      if (error instanceof SoapFaultError && error.isTransactionNotFound) {
        console.log(
          `   [WARN] Transaction already acknowledged (TRANSACTION_NOT_FOUND) for ${originalMsgId}. Continuing...`,
        );
        return {
          success: true,
          alreadyAcknowledged: true,
          response: "Already acknowledged",
        };
      }

      console.error(
        `   [ERROR] Acknowledgement failed for ${originalMsgId}:`,
        error,
      );
      return { success: false, error };
    }
  },

  /**
   * Forward reversal amount to NBCHQ via SOAP makeFullFundTransfer (ISO 20022 pain.001 payload).
   */
  async makeFullFundTransfer(
    amount: number,
    currency: string,
    destinationBic: string,
    destinationAccount: string,
  ): Promise<string> {
    // Generate ISO 20022 XML and get the reference ID
    const { isoMessage, extRef } = generateIsoMessage(
      amount,
      currency,
      destinationBic,
      destinationAccount,
    );

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
         <soapenv:Header/>
         <soapenv:Body>
            <web:makeFullFundTransfer>
               <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
               <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
               <web:ext_ref>${extRef}</web:ext_ref>
               <web:iso_message><![CDATA[${isoMessage}]]></web:iso_message>
            </web:makeFullFundTransfer>
         </soapenv:Body>
      </soapenv:Envelope>`;

    return await sendSoapRequest(soapBody);
  },

  /**
   * Send a pain.007 Customer Payment Reversal via SOAP makeReverseTransaction.
   */
  async makeReverseTransaction(
    amount: number,
    currency: string,
    originalMsgId: string,
    originalPmtInfId: string,
    debtorAccount: string,
  ): Promise<string> {
    const reversalXml = generateReversalMessage(
      amount,
      currency,
      originalMsgId,
      originalPmtInfId,
      debtorAccount,
    );

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
         <soapenv:Header/>
         <soapenv:Body>
            <web:makeReverseTransaction>
               <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
               <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
               <web:content_message><![CDATA[${reversalXml}]]></web:content_message>
            </web:makeReverseTransaction>
         </soapenv:Body>
      </soapenv:Envelope>`;

    return await sendSoapRequest(soapBody);
  },

  /**
   * Send pain.002.001.03 Acknowledgment for incoming pain.007 Reversal Requests.
   * This tells NBCHQ: "We have received your reversal request."
   */
  async sendPain002Ack(
    originalMsgId: string,
    originalEndToEndId: string,
  ): Promise<{
    success: boolean;
    response?: string;
    error?: any;
  }> {
    console.log(
      `   [INFO] Sending pain.002 ACK for pain.007 reversal request ${originalMsgId}...`,
    );

    const now = new Date();
    const timestamp = now.getTime();
    const creditorBic = process.env.BAKONG_CREDITOR_BIC || "BKRTKHPPXXX";
    const debtorBic = process.env.BAKONG_DEBTOR_BIC || "TOURKHPPXXX";
    const msgId = `ACK${creditorBic}${timestamp}`;
    const createDateTime = now.toISOString();

    // Generate pain.002.001.03 Customer Payment Status Report
    const pain002Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <CstmrPmtStsRpt>
      <GrpHdr>
         <MsgId>${msgId}</MsgId>
         <CreDtTm>${createDateTime}</CreDtTm>
      </GrpHdr>
      <OrgnlGrpInfAndSts>
         <OrgnlMsgId>${originalMsgId}</OrgnlMsgId>
         <OrgnlMsgNmId>pain.007.001.05</OrgnlMsgNmId>
         <GrpSts>ACCP</GrpSts>
      </OrgnlGrpInfAndSts>
      <OrgnlPmtInfAndSts>
         <OrgnlPmtInfId>${originalMsgId}</OrgnlPmtInfId>
         <TxInfAndSts>
            <StsId>${timestamp}</StsId>
            <OrgnlEndToEndId>${originalEndToEndId}</OrgnlEndToEndId>
            <TxSts>ACCP</TxSts>
         </TxInfAndSts>
      </OrgnlPmtInfAndSts>
   </CstmrPmtStsRpt>
</Document>`;

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
         <soapenv:Header/>
         <soapenv:Body>
            <web:makeAcknowledgement>
               <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
               <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
               <web:content_message><![CDATA[${pain002Xml}]]></web:content_message>
            </web:makeAcknowledgement>
         </soapenv:Body>
      </soapenv:Envelope>`;

    try {
      const response = await sendSoapRequest(soapBody);
      console.log(`   [SUCCESS] pain.002 ACK sent successfully for ${originalMsgId}`);
      return { success: true, response };
    } catch (error) {
      console.error(
        `   [ERROR] Failed to send pain.002 ACK for ${originalMsgId}:`,
        error,
      );
      return { success: false, error };
    }
  },
};

/**
 * Build pain.001 Credit Transfer XML and ext_ref for makeFullFundTransfer.
 * Sender = env (TOUR); receiver = destinationBic/destinationAccount.
 */
function generateIsoMessage(
  amount: number,
  currency: string,
  destinationBic: string,
  destinationAccount: string,
): { isoMessage: string; extRef: string } {
  const SENDER_BIC = process.env.BAKONG_DEBTOR_BIC || "TOURKHPPXXX";
  const SENDER_ACC = process.env.BAKONG_DEBTOR_ACCOUNT || "015039685739105";
  const SENDER_NAME = "TOURKHPP";

  const RECEIVER_BIC = destinationBic;
  const RECEIVER_ACC = destinationAccount;
  const RECEIVER_NAME = "Refund Recipient";

  const now = new Date();
  const timestamp = now.getTime();
  const refId = `${timestamp}`.slice(-10);

  const msgId = `CRT${RECEIVER_BIC}${timestamp}`;

  const createDateTime = now.toISOString().replace("Z", "+07:00");
  const reqExecutionDate = now.toISOString().split("T")[0];
  const relatedDate = reqExecutionDate + "+07:00";

  const pmtInfId = `${SENDER_BIC}/${RECEIVER_BIC}/${refId}`;
  const instrId = `${SENDER_BIC}/${refId}`;
  const endToEndId = `${SENDER_ACC}-${RECEIVER_ACC}`;

  const isoMessage = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Document xsi:schemaLocation="xsd/pain.001.001.05.xsd" xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                <CstmrCdtTrfInitn>
                    <GrpHdr>
                        <MsgId>${msgId}</MsgId>
                        <CreDtTm>${createDateTime}</CreDtTm>
                        <NbOfTxs>1</NbOfTxs>
                        <CtrlSum>${amount}</CtrlSum>
                        <InitgPty>
                            <Nm>${SENDER_NAME}</Nm>
                        </InitgPty>
                    </GrpHdr>
                    <PmtInf>
                        <PmtInfId>${pmtInfId}</PmtInfId>
                        <PmtMtd>TRF</PmtMtd>
                        <BtchBookg>false</BtchBookg>
                        <ReqdExctnDt>${reqExecutionDate}</ReqdExctnDt>
                        <Dbtr>
                            <Nm>${SENDER_NAME}</Nm>
                        </Dbtr>
                        <DbtrAcct>
                            <Id>
                                <Othr>
                                    <Id>${SENDER_ACC}</Id>
                                </Othr>
                            </Id>
                            <Ccy>${currency}</Ccy>
                        </DbtrAcct>
                        <DbtrAgt>
                            <FinInstnId>
                                <BICFI>${SENDER_BIC}</BICFI>
                            </FinInstnId>
                        </DbtrAgt>
                        <CdtTrfTxInf>
                            <PmtId>
                                <InstrId>${instrId}</InstrId>
                                <EndToEndId>${endToEndId}</EndToEndId>
                            </PmtId>
                            <Amt>
                                <InstdAmt Ccy="${currency}">${amount}</InstdAmt>
                            </Amt>
                            <ChrgBr>CRED</ChrgBr>
                            <CdtrAgt>
                                <FinInstnId>
                                    <BICFI>${RECEIVER_BIC}</BICFI>
                                </FinInstnId>
                            </CdtrAgt>
                            <Cdtr>
                                <Nm>${RECEIVER_NAME}</Nm>
                            </Cdtr>
                            <CdtrAcct>
                                <Id>
                                    <Othr>
                                        <Id>${RECEIVER_ACC}</Id>
                                    </Othr>
                                </Id>
                            </CdtrAcct>
                            <Purp>
                                <Cd>GDDS</Cd>
                            </Purp>
                            <RmtInf>
                                <Ustrd>Refund-OBS-${timestamp}</Ustrd>
                                <Strd>
                                    <RfrdDocInf>
                                        <Tp>
                                            <CdOrPrtry>
                                                <Cd>CINV</Cd>
                                            </CdOrPrtry>
                                        </Tp>
                                        <Nb>1</Nb>
                                        <RltdDt>${relatedDate}</RltdDt>
                                    </RfrdDocInf>
                                    <AddtlRmtInf>Phnom Penh/${refId}</AddtlRmtInf>
                                </Strd>
                            </RmtInf>
                        </CdtTrfTxInf>
                    </PmtInf>
                </CstmrCdtTrfInitn>
            </Document>`;

  return {
    isoMessage,
    extRef: pmtInfId,
  };
}

/**
 * Build pain.007 Customer Payment Reversal XML for makeReverseTransaction.
 */
function generateReversalMessage(
  amount: number,
  currency: string,
  originalMsgId: string,
  originalPmtInfId: string,
  debtorAccount: string,
): string {
  const now = new Date();
  const timestamp = now.getTime();

  const DEBTOR_BIC = process.env.BAKONG_DEBTOR_BIC || "TOURKHPPXXX";
  const CREDITOR_BIC = process.env.BAKONG_CREDITOR_BIC || "BKRTKHPPXXX";

  const msgId = `CRT${DEBTOR_BIC}${timestamp}`;
  const createDateTime = now.toISOString();
  const originalCreDtTm = new Date(now.getTime() - 6 * 60 * 1000).toISOString();
  const reqExecutionDate = now.toISOString().split("T")[0] + "Z";
  const reversalId = `FT${timestamp}`;
  const numberOfTxs = 1;

  return `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <CstmrPmtRvsl>
        <GrpHdr>
            <MsgId>${msgId}</MsgId>
            <CreDtTm>${createDateTime}</CreDtTm>
            <NbOfTxs>${numberOfTxs}</NbOfTxs>
            <DbtrAgt>
                <FinInstnId>
                    <BICFI>${DEBTOR_BIC}</BICFI>
                </FinInstnId>
            </DbtrAgt>
            <CdtrAgt>
                <FinInstnId>
                    <BICFI>${CREDITOR_BIC}</BICFI>
                </FinInstnId>
            </CdtrAgt>
        </GrpHdr>
        <OrgnlGrpInf>
            <OrgnlMsgId>${originalMsgId}</OrgnlMsgId>
            <OrgnlMsgNmId>pain.001.001.05</OrgnlMsgNmId>
            <OrgnlCreDtTm>${originalCreDtTm}</OrgnlCreDtTm>
        </OrgnlGrpInf>
        <OrgnlPmtInfAndRvsl>
            <OrgnlPmtInfId>${originalPmtInfId}</OrgnlPmtInfId>
            <TxInf>
                <RvslId>${reversalId}</RvslId>
                <OrgnlInstdAmt Ccy="${currency}">${amount}</OrgnlInstdAmt>
                <RvsdInstdAmt Ccy="${currency}">${amount}</RvsdInstdAmt>
                <RvslRsnInf>
                    <Orgtr>
                        <Nm>${DEBTOR_BIC}</Nm>
                    </Orgtr>
                    <Rsn>
                        <Cd>GDDS</Cd>
                    </Rsn>
                </RvslRsnInf>
                <OrgnlTxRef>
                    <ReqdExctnDt>${reqExecutionDate}</ReqdExctnDt>
                    <Dbtr>
                        <Nm>${DEBTOR_BIC}</Nm>
                    </Dbtr>
                    <DbtrAcct>
                        <Id>
                            <Othr>
                                <Id>${debtorAccount}</Id>
                            </Othr>
                        </Id>
                    </DbtrAcct>
                    <Cdtr>
                        <Nm>${CREDITOR_BIC}</Nm>
                    </Cdtr>
                </OrgnlTxRef>
            </TxInf>
        </OrgnlPmtInfAndRvsl>
    </CstmrPmtRvsl>
</Document>`;
}
