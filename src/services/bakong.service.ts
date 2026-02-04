import { postRequest } from "../utils/http-client";
import { sendSoapRequest } from "../utils/soap-client";
import dotenv from "dotenv";

dotenv.config();

export interface BakongTransactionResponse {
  responseCode: number;
  responseMessage: string;
  data?: any;
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
  ): Promise<{ success: boolean; response?: string; error?: any }> {
    console.log(`   📩 Sending makeAcknowledgement for ${originalMsgId}...`);

    const now = new Date();
    const timestamp = now.getTime();
    const msgId = `ACK${debtorBic}${timestamp}`;
    const createDateTime = now.toISOString();

    // Generate pain.002.001.06 Customer Payment Status Report
    const pain002Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document xsi:schemaLocation="jaxb/iso20022/pain.002.001.06.xsd" xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.06" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <CstmrPmtStsRpt>
      <GrpHdr>
         <MsgId>${msgId}</MsgId>
         <CreDtTm>${createDateTime}</CreDtTm>
         <InitgPty>
            <Nm>${debtorBic}</Nm>
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
         <OrgnlMsgNmId>pain.001.001.05</OrgnlMsgNmId>
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
      console.log(`   ✅ Acknowledgement successful for ${originalMsgId}`);
      return { success: true, response };
    } catch (error) {
      console.error(
        `   ❌ Acknowledgement failed for ${originalMsgId}:`,
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
