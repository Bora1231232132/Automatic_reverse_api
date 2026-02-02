# 🧪 Test Samples for Reversal Detection

## ⚠️ Important: SOAP Request Format

When using XML inside SOAP CDATA sections, **DO NOT include the XML declaration** (`<?xml version="1.0"?>`).

**❌ WRONG:**

```xml
<web:iso_message><![CDATA[
<?xml version="1.0" encoding="UTF-8"?>  ← REMOVE THIS!
<Document>...</Document>
]]></web:iso_message>
```

**✅ CORRECT:**

```xml
<web:iso_message><![CDATA[
<Document>...</Document>  ← No XML declaration inside CDATA
]]></web:iso_message>
```

The SOAP envelope itself handles the XML declaration. Including it inside CDATA causes: `WRONG_REQUEST_DATA(The processing instruction target matching "[xX][mM][lL]" is not allowed.)`

---

## Quick Start Testing

### Option 1: Use Mock Server (Easiest)

1. **Enable Mock Mode** in `.env.development`:

```env
BAKONG_SOAP_URL=http://localhost:3000/mock-bakong
```

2. **Start Server**:

```bash
npm run dev
```

3. **Wait 60 seconds** - Bot will automatically test!

---

## Test Scenarios

### Test Case 1: Valid Reversal with REVERSING Keyword ✅

**Expected:** Bot detects reversal and auto-refunds

**Complete SOAP Request (for testing):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:makeFullFundTransfer>
         <web:cm_user_name>bora</web:cm_user_name>
         <web:cm_password>Bora123!@</web:cm_password>
         <web:iso_message><![CDATA[
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>TEST001/015039685739105</MsgId>
      <CreDtTm>2026-01-29T10:00:00.000+07:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>800</CtrlSum>
      <InitgPty>
        <Nm>Bakong Retail</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>BKRTKHPPXXX/TOURKHPPXXX/TEST001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>false</BtchBookg>
      <ReqdExctnDt>2026-01-29</ReqdExctnDt>
      <Dbtr>
        <Nm>BKRT TEST SENDER</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>000886653481654</Id>
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
              <Id>015039685739105</Id>
            </Othr>
          </Id>
        </CdtrAcct>
        <Purp>
          <Prtry>GDDS</Prtry>
        </Purp>
        <RmtInf>
          <Ustrd>REVERSING - test_reversal_001</Ustrd>
          <Ustrd>trx_hash:97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
]]></web:iso_message>
         <web:ext_ref>TEST001</web:ext_ref>
      </web:makeFullFundTransfer>
   </soapenv:Body>
</soapenv:Envelope>
```

**Important:** The Document XML inside `<![CDATA[...]]>` should NOT include `<?xml version="1.0"?>` declaration. The SOAP envelope handles the XML declaration.

**What Bot Should Do:**

1. ✅ Detect "REVERSING" keyword
2. ✅ Extract hash: `97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964`
3. ✅ Validate hash via REST API
4. ✅ Send refund: TOUR → BKRT (800 KHR)
5. ✅ Save to database

---

### Test Case 2: Regular Payment (No Reversal) ⏹️

**Expected:** Bot skips this transaction

**Complete SOAP Request (for testing):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:makeFullFundTransfer>
         <web:cm_user_name>bora</web:cm_user_name>
         <web:cm_password>Bora123!@</web:cm_password>
         <web:iso_message><![CDATA[
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>REGULAR001/015039685739105</MsgId>
      <CreDtTm>2026-01-29T10:00:00.000+07:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>1000</CtrlSum>
      <InitgPty>
        <Nm>Bakong Retail</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>BKRTKHPPXXX/TOURKHPPXXX/REGULAR001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>false</BtchBookg>
      <ReqdExctnDt>2026-01-29</ReqdExctnDt>
      <Dbtr>
        <Nm>BKRT TEST SENDER</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>000886653481654</Id>
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
          <InstrId>REGULAR001</InstrId>
          <EndToEndId>REGULAR001</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="KHR">1000</InstdAmt>
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
              <Id>015039685739105</Id>
            </Othr>
          </Id>
        </CdtrAcct>
        <Purp>
          <Prtry>GDDS</Prtry>
        </Purp>
        <RmtInf>
          <Ustrd>TRANSFER/AAAA0001</Ustrd>
          <Ustrd>trx_hash:cfab98eaedf5ab1ccc4ac4d0178fa0e637ece113a031de60bc77c6726123750a</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
]]></web:iso_message>
         <web:ext_ref>REGULAR001</web:ext_ref>
      </web:makeFullFundTransfer>
   </soapenv:Body>
</soapenv:Envelope>
```

**What Bot Should Do:**

1. ⏹️ No "REVERSING" keyword found
2. ⏹️ Skip transaction (not a reversal)

---

## Postman Test Collection

### Request 1: Test Mock Server

**Method:** `POST`  
**URL:** `http://localhost:3000/mock-bakong`  
**Headers:**

```
Content-Type: text/xml
```

**Body (raw XML):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <getIncomingTransaction/>
   </soapenv:Body>
</soapenv:Envelope>
```

---

### Request 2: Test Real NBC Endpoint

**Method:** `POST`  
**URL:** `http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface`  
**Headers:**

```
Content-Type: text/xml
```

**Body (raw XML):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:getIncomingTransaction>
         <web:cm_user_name>bora</web:cm_user_name>
         <web:cm_password>Bora123!@</web:cm_password>
         <web:payee_participant_code>TOURKHPPXXX</web:payee_participant_code>
         <web:size>200</web:size>
      </web:getIncomingTransaction>
   </soapenv:Body>
</soapenv:Envelope>
```

---

## Database Verification Queries

```sql
-- Check all processed reversals
SELECT * FROM transaction_logs ORDER BY created_at DESC;

-- Count successful reversals
SELECT COUNT(*) as total_reversals
FROM transaction_logs
WHERE status = 'SUCCESS';

-- Check specific hash
SELECT * FROM transaction_logs
WHERE trx_hash = '97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964';

-- Clear test data (if needed)
DELETE FROM transaction_logs WHERE trx_hash LIKE 'TEST%';
```

---

## Expected Console Output

### Successful Reversal Detection:

```
--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
📝 RAW XML from NBC: <?xml version="1.0"...
📋 Found 1 transaction(s) in response
📝 Transaction XML: <?xml version="1.0"...
📋 Document Type: pain.001.001.05 (CstmrCdtTrfInitn) ⚠️ NOT REVERSAL FORMAT
📋 DbtrAgt BIC: BKRTKHPPXXX → CdtrAgt BIC: TOURKHPPXXX
📄 Step 2: Parsed Data. Hash: 97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964 | Reversal? true
🔎 Step 3.5: Verifying hash 97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964 with Bakong Open API...
✅ Verified! Transaction exists and is valid.
🟢 Step 3: New Transaction found! Proceeding to Refund...
💸 Sending refund: 800 KHR to BKRTKHPPXXX (000886653481654)
🚀 Step 4: Refund Transfer Sent to Bakong.
💾 Step 5: Saved to Database. Cycle Complete.
```

### Regular Payment (Skipped):

```
📄 Step 2: Parsed Data. Hash: cfab98eaedf5ab1ccc4ac4d0178fa0e637ece113a031de60bc77c6726123750a | Reversal? false
⏹️  No reversal found in this transaction. Skipping.
```

### Duplicate Prevention:

```
📄 Step 2: Parsed Data. Hash: 97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964 | Reversal? true
⛔ Step 3: STOP! Transaction 97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964 was already processed.
```

---

## Quick Test Checklist

- [ ] Mock server enabled in `.env.development`
- [ ] Server running (`npm run dev`)
- [ ] Wait 60 seconds for cron cycle
- [ ] See "🔄 Detected" or "⏹️ No reversal" in logs
- [ ] Check database for saved transactions
- [ ] Verify duplicate prevention works (wait another 60s)
