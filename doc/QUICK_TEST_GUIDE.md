# 🧪 Quick Testing Guide - Reversal Detection

## ✅ **FASTEST TEST (5 Minutes)**

This will prove your system works **right now** without waiting for NBC!

---

## 🎭 Method 1: Mock Server Test (RECOMMENDED - START HERE!)

### Step 1: Enable Mock Mode

Open `.env.development` and change line 18:

```env
# FROM THIS:
BAKONG_SOAP_URL=http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface

# TO THIS:
BAKONG_SOAP_URL=http://localhost:3000/mock-bakong
```

**Or comment/uncomment these lines:**

```env
# 🏦 PRODUCTION MODE - Using real NBC endpoint
# BAKONG_SOAP_URL=http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface

# 🎭 MOCK MODE - Uncomment to use local test server:
BAKONG_SOAP_URL=http://localhost:3000/mock-bakong
```

### Step 2: Start Your Server

Open terminal and run:

```bash
npm run dev
```

### Step 3: Watch the Magic! ✨

Within 60 seconds, you'll see:

```bash
🚀 System Online!
📡 Server listening on port 3000
🎭 Mock Mode: Using local mock server for SOAP
⏰ Cron Scheduler: ACTIVATED (Running every 60s)
⏳ Waiting for next Cron tick...

--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
📋 Parsed JSON: {
  "Document": {
    "CstmrPmtRvsl": {   ← ✅ REVERSAL DETECTED!
      ...
    }
  }
}
🔄 Detected: Payment Reversal (pain.007.001.05)   ← ✅ SUCCESS!
📄 Step 2: Parsed Data. Hash: 40cb600f850c47c5985d706aabc9d631 | Reversal? true
🔎 Step 3.5: Verifying hash with Bakong Open API...
✅ Verified! Transaction exists and is valid.
🟢 Step 3: New Transaction found! Proceeding to Refund...
🚀 Step 4: Reversal Request Sent to Bakong.
💾 Step 5: Saved to Database. Cycle Complete.
```

### Step 4: Verify Database

Open another terminal and run:

```bash
# Connect to PostgreSQL
psql -U void_user -d nbc_intergration_db

# Check the transaction was saved
SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**

```
 id |              trx_hash              | amount | currency | status  |         created_at
----+------------------------------------+--------+----------+---------+----------------------------
  1 | 40cb600f850c47c5985d706aabc9d631  |  800   | KHR      | SUCCESS | 2026-01-28 10:15:00.123456
```

### Step 5: Test Duplicate Prevention

Wait 60 seconds for the next cron cycle. You should see:

```bash
--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
📋 Parsed JSON: {...}
🔄 Detected: Payment Reversal (pain.007.001.05)
📄 Step 2: Parsed Data. Hash: 40cb600f850c47c5985d706aabc9d631 | Reversal? true
⛔ Step 3: STOP! Transaction 40cb600f850c47c5985d706aabc9d631 was already processed.
```

**✅ If you see this, duplicate prevention works!**

---

## 📬 Method 2: Postman Test (Manual Control)

### Step 1: Start Your Server (Mock Mode)

```bash
npm run dev
```

### Step 2: Open Postman

Create a new request:

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

### Step 3: Click Send

You'll get back XML with `<CstmrPmtRvsl>` - this is what your cron job sees!

### Step 4: Check Server Logs

Your server should show the same detection messages as Method 1.

---

## 🏦 Method 3: Test with Real NBC Endpoint (Production Test)

### ⚠️ Warning: This tests the real SOAP API

### Step 1: Switch Back to Production Mode

In `.env.development`:

```env
# 🏦 PRODUCTION MODE
BAKONG_SOAP_URL=http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface
```

### Step 2: Start Server

```bash
npm run dev
```

### Step 3: Wait for Real Reversal from NBC

Watch the logs. When NBC sends a reversal, you'll see the same detection flow.

### Step 4: Ask NBC to Send Test Reversal

Contact NBC support:

> "Hi, can you please send a test reversal transaction to our account in the SIT environment? We need to test our automation system. Our SOAP username is `soap1`."

---

## 🔍 Method 4: Database Check (Verify It Worked)

After any test above, check the database:

```sql
-- Connect to database
psql -U void_user -d nbc_intergration_db

-- View all processed transactions
SELECT
    id,
    trx_hash,
    amount,
    currency,
    status,
    created_at
FROM transaction_logs
ORDER BY created_at DESC;

-- Count successful reversals
SELECT COUNT(*) as total_reversals
FROM transaction_logs
WHERE status = 'SUCCESS';

-- Check if specific hash exists (duplicate prevention test)
SELECT EXISTS(
    SELECT 1 FROM transaction_logs
    WHERE trx_hash = '40cb600f850c47c5985d706aabc9d631'
) as already_processed;
```

---

## ✅ Success Checklist

After running tests, verify:

- [ ] ✅ Server starts without errors
- [ ] ✅ Cron job runs every 60 seconds
- [ ] ✅ Console shows "🔄 Detected: Payment Reversal (pain.007.001.05)"
- [ ] ✅ Console shows "✅ Verified! Transaction exists and is valid"
- [ ] ✅ Console shows "🚀 Step 4: Reversal Request Sent to Bakong"
- [ ] ✅ Console shows "💾 Step 5: Saved to Database"
- [ ] ✅ Database contains the transaction
- [ ] ✅ Next cycle shows "⛔ STOP! Transaction ... was already processed"

---

## 🚨 Troubleshooting

### Issue 1: "Connection refused" on mock server

**Solution:** Make sure server is running:

```bash
npm run dev
```

### Issue 2: "Database connection failed"

**Solution:** Check PostgreSQL is running:

```bash
# Windows - check if PostgreSQL service is running
sc query postgresql-x64-14
```

### Issue 3: No reversal detected

**Check:**

1. `.env.development` has `BAKONG_SOAP_URL=http://localhost:3000/mock-bakong`
2. Server is actually running
3. Wait full 60 seconds for cron cycle

### Issue 4: "Transaction already exists" on first run

**Clean database:**

```sql
DELETE FROM transaction_logs WHERE trx_hash = '40cb600f850c47c5985d706aabc9d631';
```

Then restart server and try again.

---

## 🎯 Recommended Testing Order

1. **Start:** Mock Server Test (Method 1) - 5 minutes
2. **Verify:** Database Check (Method 4) - 2 minutes
3. **Manual:** Postman Test (Method 2) - 3 minutes
4. **Production:** Real NBC Test (Method 3) - When ready

---

## 📹 Expected Video Timeline (Mock Test)

**00:00** - Run `npm run dev`  
**00:05** - Server starts, shows "Mock Mode"  
**00:10** - Shows "Cron Scheduler: ACTIVATED"  
**01:00** - First cron tick  
**01:05** - "🔄 Detected: Payment Reversal"  
**01:10** - "✅ Verified! Transaction exists"  
**01:15** - "🚀 Reversal Request Sent"  
**01:20** - "💾 Saved to Database"  
**02:00** - Second cron tick  
**02:05** - "⛔ STOP! Transaction ... already processed"

**✅ TEST COMPLETE!**

---

## 🎉 What Success Looks Like

```bash
--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
📋 Parsed JSON: {...}
🔄 Detected: Payment Reversal (pain.007.001.05)   ← ✅ DETECTION WORKS!
📄 Step 2: Parsed Data. Hash: 40cb600f850c47c5985d706aabc9d631 | Reversal? true
🔎 Step 3.5: Verifying hash with Bakong Open API...
✅ Verified! Transaction exists and is valid.        ← ✅ VALIDATION WORKS!
🟢 Step 3: New Transaction found! Proceeding to Refund...
🚀 Step 4: Reversal Request Sent to Bakong.         ← ✅ AUTO-TRANSACTION SENT!
    FROM: NBCOKHPPXXX
    TO: NBHQKHPPXXX
💾 Step 5: Saved to Database. Cycle Complete.       ← ✅ DATABASE WORKS!
```

**Next cycle:**

```bash
⛔ Step 3: STOP! Transaction ... was already processed.  ← ✅ DUPLICATE PREVENTION WORKS!
```

---

## 🚀 **START NOW - Run This Command:**

```bash
npm run dev
```

Then watch for 60 seconds! That's it! 🎯
