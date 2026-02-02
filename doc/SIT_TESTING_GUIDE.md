# 🧪 SIT Testing Guide - Creating Fake Reversal Scenario

## How to Create and Test Reversal in NBC SIT Environment

**Date:** 2026-01-28  
**Environment:** SIT (System Integration Testing)  
**Account:** NBCOKHPPXXX  
**Expected Flow:** NBCOKHPP → NBHQKHPP

---

## 🎯 **Testing Objective**

Create a fake reversal transaction in NBC SIT environment to verify:

1. ✅ Your system **detects** the reversal
2. ✅ Your system **verifies** with REST API
3. ✅ Your system **auto-sends** NBCOKHPP → NBHQKHPP transaction
4. ✅ Your system **saves** to database
5. ✅ Your system **prevents duplicates**

---

## 📋 **Prerequisites**

### **1. Your System Must Be Running**

```bash
# Make sure you're using PRODUCTION endpoint (not mock)
# Check .env.development line 18:
BAKONG_SOAP_URL=http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface

# Start your server
npm run dev
```

### **2. System Health Check**

Verify your server shows:

```bash
✅ Database connection successful
🏦 Production Mode: SOAP endpoint http://10.20.6.223/...
⏰ Cron Scheduler: ACTIVATED (Running every 60s)
⏳ Waiting for next Cron tick...
```

---

## 🎬 **Method 1: Ask NBC to Send Test Reversal (Recommended)**

### **Step 1: Contact NBC Support/Team**

Send them this request:

```
Subject: Test Reversal Transaction Request for SIT Environment

Hi NBC Team,

We have deployed an automated reversal system and need to test it in the SIT environment.

Could you please send a TEST REVERSAL transaction to our account with the following details:

Account Details:
- Payee Participant Code: NBCOKHPPXXX
- SOAP Username: soap1
- SOAP Password: P@ssw0rd123

Test Transaction Details:
- Amount: 800 KHR (or any test amount)
- Transaction Type: Payment Reversal (ISO 20022 pain.007.001.05)
- Message Format: <CstmrPmtRvsl> (Customer Payment Reversal)

Purpose:
Testing our automated reversal detection and processing system.

Our system will:
1. Detect the reversal via getIncomingTransaction
2. Verify the transaction hash
3. Automatically send reversal response: NBCOKHPP → NBHQKHPP
4. Log to our database

Please let us know when the test reversal has been sent so we can monitor our system.

Thank you!
```

### **Step 2: Monitor Your System**

Once NBC confirms they've sent the test reversal, watch your console:

```bash
# Within 60 seconds you should see:

--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
📋 Parsed JSON: {
  "ns2:return": "<![CDATA[<Document>...]]>"  ← NOT EMPTY!
}
🔄 Detected: Payment Reversal (pain.007.001.05)   ← ✅ SUCCESS!
📄 Step 2: Parsed Data. Hash: [hash] | Reversal? true
🔎 Step 3.5: Verifying hash with Bakong Open API...
✅ Verified! Transaction exists and is valid.
🟢 Step 3: New Transaction found! Proceeding to Refund...
🚀 Step 4: Reversal Request Sent to Bakong.
    FROM: NBCOKHPP
    TO: NBHQKHPP
💾 Step 5: Saved to Database. Cycle Complete.
```

### **Step 3: Verify in Database**

```sql
-- Check the transaction was saved
SELECT * FROM transaction_logs
ORDER BY created_at DESC
LIMIT 1;

-- You should see:
-- id | trx_hash | amount | currency | status  | created_at
-- 1  | [hash]   | 800    | KHR      | SUCCESS | 2026-01-28 10:45:00
```

### **Step 4: Test Duplicate Prevention**

Wait another 60 seconds. Your system should show:

```bash
--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
🔄 Detected: Payment Reversal (pain.007.001.05)
📄 Step 2: Parsed Data. Hash: [same hash] | Reversal? true
⛔ Step 3: STOP! Transaction [hash] was already processed.  ← ✅ DUPLICATE PREVENTED!
```

---

## 🔧 **Method 2: Use Postman to Simulate (If NBC Provides Test Endpoint)**

### **Step 1: Create Test Transaction (If NBC Allows)**

Some banks provide a test API to create fake transactions. Check with NBC if they have:

```
POST https://sit-api-bakong.nbc.gov.kh/test/create-reversal
```

**Request Body:**

```json
{
  "account": "NBCOKHPPXXX",
  "amount": "800",
  "currency": "KHR",
  "transaction_type": "REVERSAL",
  "original_msg_id": "test_reversal_001"
}
```

### **Step 2: Monitor Your System**

After creating the test transaction, your system should detect it within 60 seconds.

---

## 📱 **Method 3: Use Bakong Mobile App (If Available in SIT)**

### **Step 1: Get SIT Bakong App**

NBC might provide a test version of the Bakong mobile app for SIT.

### **Step 2: Create Transaction**

1. Make a payment to NBCOKHPPXXX account
2. Amount: 800 KHR
3. Complete the transaction

### **Step 3: Request Reversal**

Through NBC or the app, initiate a reversal of that transaction.

### **Step 4: Monitor Your System**

Your automation should detect and process the reversal within 60 seconds.

---

## 🔍 **What to Monitor**

### **Terminal 1: Your Application**

```bash
npm run dev

# Watch for:
# - ✅ Cron triggers every 60s
# - ✅ Reversal detection
# - ✅ REST API verification
# - ✅ Auto-sent transaction
# - ✅ Database save
```

### **Terminal 2: Database Monitoring (Optional)**

```bash
# Watch database in real-time
psql -U void_user -d nbc_intergration_db

# Run this query every 10 seconds:
SELECT
    id,
    trx_hash,
    amount,
    currency,
    status,
    created_at
FROM transaction_logs
ORDER BY created_at DESC
LIMIT 5;
```

### **Postman (Optional)**

You can also manually check NBC API:

```
POST http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface

Body:
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
```

---

## ✅ **Success Criteria**

Your test is successful when you see ALL of these:

### **1. Detection Phase**

- [ ] ✅ System calls getIncomingTransaction
- [ ] ✅ NBC returns non-empty response
- [ ] ✅ System logs: `🔄 Detected: Payment Reversal (pain.007.001.05)`
- [ ] ✅ Parser extracts: transaction hash, amount, currency

### **2. Verification Phase**

- [ ] ✅ System calls REST API: `/v1/check_transaction_by_hash`
- [ ] ✅ Response: `responseCode: 0` (valid)
- [ ] ✅ System logs: `✅ Verified! Transaction exists and is valid`

### **3. Processing Phase**

- [ ] ✅ System checks database: transaction NOT exists
- [ ] ✅ System logs: `🟢 New Transaction found! Proceeding to Refund...`
- [ ] ✅ System sends SOAP: `makeReverseTransaction`
- [ ] ✅ System logs: `🚀 Reversal Request Sent to Bakong`

### **4. Storage Phase**

- [ ] ✅ System inserts to `transaction_logs` table
- [ ] ✅ System logs: `💾 Saved to Database. Cycle Complete`
- [ ] ✅ Database query confirms: 1 new row with correct hash

### **5. Duplicate Prevention Phase**

- [ ] ✅ Next cron cycle (60s later)
- [ ] ✅ System detects same reversal again
- [ ] ✅ System logs: `⛔ STOP! Transaction [hash] was already processed`
- [ ] ✅ No duplicate entry in database

---

## 🚨 **Troubleshooting**

### **Issue 1: Still seeing empty response**

```json
"ns2:return": ""   ← Still empty
```

**Possible causes:**

1. NBC hasn't sent the test reversal yet
2. Test reversal sent to different account (not NBCOKHPPXXX)
3. Timing issue - wait longer (could take a few minutes)

**Solution:**

- Confirm with NBC the test reversal was sent
- Ask NBC which account it was sent to
- Keep system running for 5-10 minutes

---

### **Issue 2: Reversal detected but verification fails**

```bash
🔄 Detected: Payment Reversal (pain.007.001.05)
🔎 Verifying hash with Bakong Open API...
❌ Validation Failed: Bakong API says this hash is invalid!
```

**Possible causes:**

1. Test hash not found in Bakong Open API
2. SIT REST API might not have test data

**Solution:**

- Ask NBC if test reversals are indexed in REST API
- Temporarily comment out verification for SIT testing (add back for production)

---

### **Issue 3: Database error**

```bash
❌ Failed to save to database
```

**Solution:**

```bash
# Check database is running
psql -U void_user -d nbc_intergration_db

# Check table exists
\dt transaction_logs

# If table missing, create it:
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    trx_hash VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 **Expected Timeline**

```
T+0:00  You: Request test reversal from NBC
T+0:05  NBC: Confirms test reversal sent
T+0:30  Your System: Next cron cycle (0-60s wait)
T+0:35  Your System: Detects reversal ✅
T+0:40  Your System: Verifies transaction ✅
T+0:45  Your System: Sends auto-reversal ✅
T+0:50  Your System: Saves to database ✅
T+1:30  Your System: Next cycle - duplicate detected ✅
T+1:35  Your System: Stops processing (already done) ✅
```

---

## 📝 **Test Report Template**

After testing, create this report:

```
SIT TEST REPORT - Bakong Reversal Automation
Date: 2026-01-28
Environment: SIT
Account: NBCOKHPPXXX

TEST RESULTS:
✅ Reversal Detection: PASS
✅ REST API Verification: PASS
✅ Auto-send Transaction: PASS (NBCOKHPP → NBHQKHPP)
✅ Database Logging: PASS
✅ Duplicate Prevention: PASS

Transaction Details:
- Hash: [transaction_hash]
- Amount: 800 KHR
- Time Detected: 10:45:00
- Time Processed: 10:45:05
- Database ID: 1

Evidence:
- Screenshot of console output
- Database query result
- NBC confirmation of received reversal transaction

Status: ✅ SYSTEM WORKING AS EXPECTED
Ready for Production: YES
```

---

## 🎯 **Next Steps After Successful Test**

### **1. Document**

- Take screenshots of successful detection
- Save database query results
- Get NBC confirmation they received your auto-reversal

### **2. Report to Boss**

> "System tested successfully in SIT environment.
> Detected reversal within 60 seconds.
> Auto-sent transaction NBCOKHPP → NBHQKHPP.
> Duplicate prevention working.
> Ready for production deployment."

### **3. Production Deployment**

Once SIT test passes:

- Keep same configuration (already pointing to production endpoint)
- System is already running in production mode
- Just monitor for real reversals

---

## ✅ **Quick Checklist**

Before starting SIT test:

- [ ] System running: `npm run dev`
- [ ] Production endpoint configured (not mock)
- [ ] Database connected and table exists
- [ ] NBC contacted for test reversal
- [ ] Monitoring console output
- [ ] Ready to check database
- [ ] Camera/screenshot tool ready for evidence

---

## 🎉 **You're Ready!**

Your system is configured and waiting. All you need is for NBC to send a test reversal to NBCOKHPPXXX!

**Good luck with your SIT testing!** 🚀

---

**Need help during testing?** Keep me updated on what you see in the logs!
