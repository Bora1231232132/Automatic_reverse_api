# NBC Report: ISO 20022 Format Issue for BKRTKHPPXXX Reversal Transactions

**Date:** January 29, 2026  
**Reported By:** Bakong Automation Team  
**Issue:** Reversal transactions from BKRTKHPPXXX are using incorrect ISO 20022 message format

---

## Executive Summary

Our automated reversal processing system has detected that reversal transactions originating from **BKRTKHPPXXX** are being transmitted using the **pain.001.001.05 (Customer Credit Transfer)** format instead of the correct **pain.007.001.05 (Customer Payment Reversal)** format as specified by ISO 20022 standards.

This causes our automated system to fail detecting these as proper reversal transactions, requiring manual intervention.

---

## Expected vs Actual Behavior

### Expected (ISO 20022 Standard)

Reversal transactions should use the `pain.007.001.05` message type with `<CstmrPmtRvsl>` root element:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
    <CstmrPmtRvsl>  ✅ CORRECT FORMAT FOR REVERSALS
        <GrpHdr>
            <MsgId>...</MsgId>
            <CreDtTm>...</CreDtTm>
        </GrpHdr>
        <OrgnlGrpInf>
            <OrgnlMsgId>...</OrgnlMsgId>
        </OrgnlGrpInf>
        <OrgnlPmtInfAndRvsl>
            <TxInf>
                <RvslId>...</RvslId>
                <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
            </TxInf>
        </OrgnlPmtInfAndRvsl>
    </CstmrPmtRvsl>
</Document>
```

### Actual (What BKRTKHPPXXX is Sending)

Currently receiving `pain.001.001.05` message type with `<CstmrCdtTrfInitn>` root element:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
    <CstmrCdtTrfInitn>  ❌ WRONG FORMAT FOR REVERSALS
        <GrpHdr>
            <MsgId>TEST001/015039685739105</MsgId>
            <CreDtTm>2026-01-28T09:03:08.523Z</CreDtTm>
        </GrpHdr>
        <PmtInf>
            <PmtInfId>BKRTKHPPXXX/TOURKHPPXXX/TEST001</PmtInfId>
            <DbtrAgt>
                <FinInstnId>
                    <BICFI>BKRTKHPPXXX</BICFI>
                </FinInstnId>
            </DbtrAgt>
            <!-- Regular payment structure instead of reversal -->
        </PmtInf>
    </CstmrCdtTrfInitn>
</Document>
```

---

## Evidence from Production Logs

### Log Evidence 1: Raw XML from NBC

```
📝 RAW XML from NBC: <?xml version="1.0" encoding="UTF-8"?>
<Document xsi:schemaLocation="xsd/pain.001.001.05.xsd"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
    <CstmrCdtTrfInitn>  ← pain.001 format (regular payment)
```

### Log Evidence 2: Format Detection

```
📋 Document Type: pain.001.001.05 (CstmrCdtTrfInitn) ⚠️ NOT REVERSAL FORMAT
📋 DbtrAgt BIC: BKRTKHPPXXX → CdtrAgt BIC: TOURKHPPXXX
```

### Log Evidence 3: Multiple Transaction Examples

All 4 transactions received in the same batch show the same issue:

1. **Transaction TEST001** - DbtrAgt: BKRTKHPPXXX - Format: pain.001.001.05 ❌
2. **Transaction test12t** - DbtrAgt: BKRTKHPPXXX - Format: pain.001.001.05 ❌
3. **Transaction FvxzASpw** - DbtrAgt: BKRTKHPPXXX - Format: pain.001.001.05 ❌
4. **Transaction j1eQDwmE** - DbtrAgt: BKRTKHPPXXX - Format: pain.001.001.05 ❌

---

## Impact on Processing

### Current Workaround

Our system uses a fallback detection method by checking for "REVERSING" keyword in the `RmtInf` field, but this is not reliable because:

1. **Not ISO 20022 compliant** - Keyword detection is a workaround, not the standard
2. **Prone to errors** - Text-based detection can have false positives/negatives
3. **Cannot extract proper reversal metadata** - Missing structured fields like `OrgnlMsgId`, `RvslId`, etc.
4. **Inconsistent** - Some transactions have malformed hash values (e.g., "trx_hash:abc123def456")

### Automated Processing Failures

```
📄 Step 2: Parsed Data. Hash: abc123def456 | Reversal? true
🔎 Step 3.5: Verifying hash abc123def456 with Bakong Open API...
❌ Validation Failed: Bakong API says this hash is invalid!
{
  responseCode: 1,
  responseMessage: 'Missing required fields',
  errorCode: 14,
  data: null
}
```

---

## ISO 20022 Standards Reference

According to ISO 20022 standard:

- **pain.001.001.05** = Customer Credit Transfer Initiation
  - Used for: **NEW payment instructions**
  - Root element: `<CstmrCdtTrfInitn>`

- **pain.007.001.05** = Customer Payment Reversal
  - Used for: **REVERSING existing payments**
  - Root element: `<CstmrPmtRvsl>`
  - Contains: Original message references, reversal reason codes, etc.

Reference: [ISO 20022 Message Definitions](https://www.iso20022.org/catalogue-messages)

---

## Requested Action

Please verify and correct the message format for reversal transactions from **BKRTKHPPXXX** to use:

1. **ISO 20022 Message Type:** `pain.007.001.05`
2. **Root Element:** `<CstmrPmtRvsl>` instead of `<CstmrCdtTrfInitn>`
3. **Include Reversal Fields:**
   - `<OrgnlGrpInf><OrgnlMsgId>` - Original message ID
   - `<OrgnlPmtInfAndRvsl><OrgnlPmtInfId>` - Original payment info ID
   - `<TxInf><RvslId>` - Reversal transaction ID
   - `<RvslRsnInf>` - Reversal reason information

---

## Contact Information

For technical clarifications or to discuss this issue further:

- **System:** Bakong Reversal Automation Bot
- **Environment:** Production (SOAP endpoint: http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface)
- **Monitoring Account:** TOURKHPPXXX (payee_participant_code)
- **Affected BIC:** BKRTKHPPXXX (sender)

---

## Appendix: Full Transaction Example

<details>
<summary>Click to expand full XML example</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xsi:schemaLocation="xsd/pain.001.001.05.xsd"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
    <CstmrCdtTrfInitn>
        <GrpHdr>
            <MsgId>TEST001/015039685739105</MsgId>
            <CreDtTm>2026-01-28T09:03:08.523Z</CreDtTm>
            <NbOfTxs>1</NbOfTxs>
            <CtrlSum>800</CtrlSum>
            <InitgPty>
                <Nm>BKRT TEST SENDER</Nm>
            </InitgPty>
        </GrpHdr>
        <PmtInf>
            <PmtInfId>BKRTKHPPXXX/TOURKHPPXXX/TEST001</PmtInfId>
            <PmtMtd>TRF</PmtMtd>
            <BtchBookg>false</BtchBookg>
            <ReqdExctnDt>2026-01-28</ReqdExctnDt>
            <Dbtr>
                <Nm>BKRT TEST SENDER</Nm>
            </Dbtr>
            <DbtrAcct>
                <Id>
                    <Othr>
                        <Id>886653481654</Id>
                    </Othr>
                </Id>
                <Ccy>KHR</Ccy>
            </DbtrAcct>
            <DbtrAgt>
                <FinInstnId>
                    <BICFI>BKRTKHPPXXX</BICFI>
                </FinInstnId>
            </DbtrAgt>
            <CdtTrfTxInf>
                <PmtId>
                    <InstrId>TEST001</InstrId>
                    <EndToEndId>TEST001</EndToEndId>
                </PmtId>
                <Amt>
                    <InstdAmt Ccy="KHR">800</InstdAmt>
                </Amt>
                <ChrgBr>CRED</ChrgBr>
                <CdtrAgt>
                    <FinInstnId>
                        <BICFI>TOURKHPPXXX</BICFI>
                    </FinInstnId>
                </CdtrAgt>
                <Cdtr>
                    <Nm>TOUR TEST RECEIVER</Nm>
                </Cdtr>
                <CdtrAcct>
                    <Id>
                        <Othr>
                            <Id>15039685739105</Id>
                        </Othr>
                    </Id>
                </CdtrAcct>
                <Purp>
                    <Prtry>GDDS</Prtry>
                </Purp>
                <RmtInf>
                    <Ustrd>REVERSING - trx_hash:abc123def456</Ustrd>
                    <Ustrd>trx_hash:0ef61c9b1bf043e69d8f4e8d402af21cec9e1e6b7886a495083247f7227fc317</Ustrd>
                    <Strd>
                        <RfrdDocInf>
                            <Tp>
                                <CdOrPrtry>
                                    <Cd>CINV</Cd>
                                </CdOrPrtry>
                            </Tp>
                            <Nb>987-AC</Nb>
                            <RltdDt>2026-01-28</RltdDt>
                        </RfrdDocInf>
                    </Strd>
                </RmtInf>
            </CdtTrfTxInf>
        </PmtInf>
    </CstmrCdtTrfInitn>
</Document>
```

</details>

---

**End of Report**
