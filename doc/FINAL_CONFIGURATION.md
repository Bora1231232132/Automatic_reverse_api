# ✅ FINAL SYSTEM CONFIGURATION

## Your Boss's Requirement: NBCOKHPP → NBHQKHPP

**Status:** ✅ **FULLY CONFIGURED AND READY**

---

## 🎯 Complete Transaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM: Bakong Reversal Automation                          │
│ ACCOUNT MONITORED: NBCOKHPPXXX                              │
│ REVERSAL FLOW: NBCOKHPP → NBHQKHPP                          │
└─────────────────────────────────────────────────────────────┘

STEP 1: Monitor Incoming Transactions (Every 60 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 SOAP Request: getIncomingTransaction
   ├─ Endpoint: http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface
   ├─ Username: soap1
   ├─ Password: P@ssw0rd123
   ├─ Payee Code: NBCOKHPPXXX  ✅ ADDED (monitors NBC operational account)
   └─ Size: 200  ✅ ADDED (fetch up to 200 transactions)

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Body>
      <web:getIncomingTransaction>
         <web:cm_user_name>soap1</web:cm_user_name>
         <web:cm_password>P@ssw0rd123</web:cm_password>
         <web:payee_participant_code>NBCOKHPPXXX</web:payee_participant_code>
         <web:size>200</web:size>
      </web:getIncomingTransaction>
   </soapenv:Body>
</soapenv:Envelope>

                            ↓

STEP 2: NBC Sends Reversal Transaction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 NBC Response Contains:

<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
    <CstmrPmtRvsl>  ← ✅ YOUR SYSTEM DETECTS THIS!
        <GrpHdr>
            <MsgId>40cb600f850c47c5985d706aabc9d631</MsgId>
        </GrpHdr>
        <OrgnlGrpInf>
            <OrgnlMsgId>40cb600f850c47c5985d706aabc9d631</OrgnlMsgId>
        </OrgnlGrpInf>
        <OrgnlPmtInfAndRvsl>
            <OrgnlPmtInfId>NBCOKHPPXXX/NBHQKHPPXXX/test4t</OrgnlPmtInfId>
            <TxInf>
                <RvslId>FT123456789</RvslId>
                <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
            </TxInf>
        </OrgnlPmtInfAndRvsl>
    </CstmrPmtRvsl>
</Document>

                            ↓

STEP 3: Detection & Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 XML Parser:
   ├─ Check for: <CstmrPmtRvsl> element
   ├─ Found? YES! ✅
   └─ Set: isReversal = true

✅ REST API Verification:
   ├─ Endpoint: https://sit-api-bakong.nbc.gov.kh/v1/check_transaction_by_hash
   ├─ Hash: 40cb600f850c47c5985d706aabc9d631
   └─ Response: { responseCode: 0 } ✅ Valid!

🛡️ Database Check:
   ├─ Query: SELECT 1 FROM transaction_logs WHERE trx_hash = ?
   └─ Result: NOT EXISTS → Continue processing ✅

                            ↓

STEP 4: AUTO-SEND REVERSAL TRANSACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 SOAP Request: makeReverseTransaction

FROM: NBCOKHPP (National Bank of Cambodia - Operational)
TO: NBHQKHPP (National Bank of Cambodia - Headquarters)

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Body>
      <web:makeReverseTransaction>
         <web:cm_user_name>soap1</web:cm_user_name>
         <web:cm_password>P@ssw0rd123</web:cm_password>
         <web:content_message><![CDATA[
            <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
               <CstmrPmtRvsl>
                  <GrpHdr>
                     <MsgId>CRTNBCOKHPP1738041600000</MsgId>
                     <CreDtTm>2026-01-28T10:32:00.000Z</CreDtTm>
                     <NbOfTxs>1</NbOfTxs>
                     <DbtrAgt>
                        <FinInstnId>
                           <BICFI>NBCOKHPP</BICFI>  ← FROM
                        </FinInstnId>
                     </DbtrAgt>
                     <CdtrAgt>
                        <FinInstnId>
                           <BICFI>NBHQKHPP</BICFI>  ← TO
                        </FinInstnId>
                     </CdtrAgt>
                  </GrpHdr>
                  <OrgnlGrpInf>
                     <OrgnlMsgId>40cb600f850c47c5985d706aabc9d631</OrgnlMsgId>
                     <OrgnlMsgNmId>pain.001.001.05</OrgnlMsgNmId>
                  </OrgnlGrpInf>
                  <OrgnlPmtInfAndRvsl>
                     <OrgnlPmtInfId>NBCOKHPPXXX/NBHQKHPPXXX/test4t</OrgnlPmtInfId>
                     <TxInf>
                        <RvslId>FT1738041600000</RvslId>
                        <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
                        <RvsdInstdAmt Ccy="KHR">800</RvsdInstdAmt>
                     </TxInf>
                  </OrgnlPmtInfAndRvsl>
               </CstmrPmtRvsl>
            </Document>
         ]]></web:content_message>
      </web:makeReverseTransaction>
   </soapenv:Body>
</soapenv:Envelope>

                            ↓

STEP 5: Save to Database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 INSERT INTO transaction_logs:
   ├─ trx_hash: 40cb600f850c47c5985d706aabc9d631
   ├─ amount: 800
   ├─ currency: KHR
   ├─ status: SUCCESS
   └─ created_at: 2026-01-28 10:32:00

                            ↓

✅ COMPLETE! System waits 60s for next cycle.
```

---

## ⚙️ Complete Configuration (.env.development)

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=void_user
DB_PASSWORD=dev
DB_NAME=nbc_intergration_db

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000

# ============================================
# BAKONG REST API (Transaction Verification)
# ============================================
BAKONG_API_URL=https://sit-api-bakong.nbc.gov.kh/v1
BAKONG_API_KEY=5b88c3cf9408262b64cd08f000a1b1e485cb15fc4d94e9a6e805cee04ffd6990
BAKONG_API_SECRET=c5a54bedadff3513ad8c159c9f1fd70b9b1d4bbf72f5fd9369b41cd081cf45b8

# ============================================
# BAKONG SOAP API (Transaction Monitoring & Execution)
# ============================================
# 🏦 PRODUCTION MODE - Using real NBC internal endpoint
BAKONG_SOAP_URL=http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface

# SOAP Credentials
BAKONG_USERNAME=soap1
BAKONG_PASSWORD=P@ssw0rd123

# 🎭 MOCK MODE - Uncomment to use local test server:
# BAKONG_SOAP_URL=http://localhost:3000/mock-bakong
# BAKONG_USERNAME=test_user
# BAKONG_PASSWORD=test_password

# ============================================
# REVERSAL TRANSACTION CONFIGURATION
# ============================================
# BIC codes define the outgoing transaction flow when reversal is detected
# From: NBCOKHPP (National Bank of Cambodia - Operational Account)
# To: NBHQKHPP (National Bank of Cambodia - Headquarters Account)
BAKONG_DEBTOR_BIC=NBCOKHPP
BAKONG_CREDITOR_BIC=NBHQKHPP

# ============================================
# SOAP TRANSACTION PARAMETERS
# ============================================
# Payee code specifies which NBC account to monitor for incoming transactions
BAKONG_PAYEE_CODE=NBCOKHPPXXX

# Maximum number of transactions to fetch per request
BAKONG_TRANSACTION_SIZE=200

# ============================================
# OTHER CONFIGURATION
# ============================================
NODE_ENV=development
```

---

## 📋 What Changed (Based on Boss's XML Files)

### ✅ **BEFORE (Missing Parameters)**

```xml
<web:getIncomingTransaction>
   <web:cm_user_name>soap1</web:cm_user_name>
   <web:cm_password>P@ssw0rd123</web:cm_password>
</web:getIncomingTransaction>
```

### ✅ **AFTER (Complete - Matches Boss's Requirements)**

```xml
<web:getIncomingTransaction>
   <web:cm_user_name>soap1</web:cm_user_name>
   <web:cm_password>P@ssw0rd123</web:cm_password>
   <web:payee_participant_code>NBCOKHPPXXX</web:payee_participant_code>  ← ✅ ADDED
   <web:size>200</web:size>  ← ✅ ADDED
</web:getIncomingTransaction>
```

---

## 🎯 System Features

### ✅ **Fully Automated**

- Runs every 60 seconds
- No manual intervention required
- 24/7 operation

### ✅ **Safety Features**

- Duplicate prevention via database
- Transaction hash verification via REST API
- Error handling for failed transactions
- Audit trail in PostgreSQL

### ✅ **Compliance**

- ISO 20022 pain.007.001.05 standard
- Proper BIC codes: NBCOKHPP → NBHQKHPP
- Complete SOAP message format
- Matches NBC specifications exactly

### ✅ **Monitoring**

- Account: NBCOKHPPXXX (NBC Operational)
- Batch size: 200 transactions per request
- Detects: Payment Reversal transactions
- Processes: Automatic outgoing to NBHQKHPP

---

## 🚀 How to Start

### **Production Mode (Real NBC Endpoint)**

```bash
npm run dev
```

The system will:

1. ✅ Connect to production SOAP endpoint: `http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface`
2. ✅ Monitor account: NBCOKHPPXXX
3. ✅ Detect reversals automatically
4. ✅ Send automatic transactions: NBCOKHPP → NBHQKHPP
5. ✅ Log everything to database

### **Mock Mode (Local Testing)**

Update `.env.development` line 18:

```env
BAKONG_SOAP_URL=http://localhost:3000/mock-bakong
```

Then:

```bash
npm run dev
```

---

## 📊 Expected Console Output

```bash
🚀 System Online!
📡 Server listening on port 3000
🏦 Production Mode: SOAP endpoint http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface
⏰ Cron Scheduler: ACTIVATED (Running every 60s)
⏳ Waiting for next Cron tick...

--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
   → Account: NBCOKHPPXXX
   → Batch Size: 200
📋 Parsed JSON: {...}
🔄 Detected: Payment Reversal (pain.007.001.05)
📄 Step 2: Parsed Data. Hash: 40cb600f... | Reversal? true
🔎 Step 3.5: Verifying hash with Bakong Open API...
✅ Verified! Transaction exists and is valid.
🟢 Step 3: New Transaction found! Proceeding to Refund...
🚀 Step 4: Reversal Request Sent to Bakong.
    FROM: NBCOKHPP (National Bank - Operational)
    TO: NBHQKHPP (National Bank - Headquarters)
    AMOUNT: 800 KHR
💾 Step 5: Saved to Database. Cycle Complete.
```

---

## ✅ Final Checklist

- [x] ✅ Monitor `getIncomingTransaction` with correct parameters
- [x] ✅ Account monitored: NBCOKHPPXXX
- [x] ✅ Batch size: 200 transactions
- [x] ✅ Detect reversal: `<CstmrPmtRvsl>` element
- [x] ✅ Verify with REST API
- [x] ✅ Check database for duplicates
- [x] ✅ Auto-send reversal: NBCOKHPP → NBHQKHPP
- [x] ✅ Save to database
- [x] ✅ Prevent duplicate processing
- [x] ✅ Full audit trail
- [x] ✅ Matches boss's XML examples
- [x] ✅ Uses correct BIC codes

---

## 🎉 Summary for Boss

**The system is production-ready and fully configured!**

✅ **Monitors NBC account:** NBCOKHPPXXX  
✅ **Fetches up to:** 200 transactions per request  
✅ **Automatically detects:** Payment reversals (pain.007.001.05)  
✅ **Automatically sends:** Outgoing transactions from NBCOKHPP to NBHQKHPP  
✅ **Prevents duplicates:** Database tracking  
✅ **Full compliance:** ISO 20022 standards

**All parameters match the XML examples you provided!**

---

**Last Updated:** 2026-01-28  
**Version:** 3.0 - Production Ready with Complete SOAP Parameters  
**Status:** ✅ **READY FOR DEPLOYMENT**
