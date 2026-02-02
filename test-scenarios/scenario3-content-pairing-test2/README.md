# Scenario 3: Content-Based Pairing Test #2

## 🎯 Overview

This is an additional test scenario for **content-based reversal pairing** with different amounts and reference IDs. Use this to verify the feature works consistently with different transaction data.

### 📋 Scenario Details

**Amount:** 250,000 KHR  
**ext_ref:** 7777666655  
**MsgId (Original):** CRTTOURKHPPXXX1738280000333  
**MsgId (Reversal):** CRTBKRTKHPPXXX1738280100444

---

## 📝 Step-by-Step Testing

### Step 1: Send Original Transfer (TOUR → BKRT)

**File:** `scenario3-step1-original.xml`

**Command:**

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml"
```

**Details:**

- From: TOURKHPPXXX (015039685739105)
- To: BKRTKHPPXXX (bkrtkhppxxx@bkrt)
- Amount: **250,000 KHR** (different from Scenario 2)
- MsgId: CRTTOURKHPPXXX1738280000333
- ext_ref: 7777666655

**Expected Bot Behavior:**

```
📥 Fetching transactions for BKRTKHPPXXX...
   ✅ Found 1 transaction(s) for BKRTKHPPXXX
📝 Stored original transaction for future pairing: CRTTOURKHPPXXX1738280000333
```

---

### Step 2: Send Reversal WITHOUT Label (BKRT → TOUR)

**File:** `scenario3-step2-reversal-no-label.xml`

**Command:**

```powershell
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml"
```

**Details:**

- From: BKRTKHPPXXX (bkrtkhppxxx@bkrt)
- To: TOURKHPPXXX (015039685739105)
- Amount: **250,000 KHR** (matches original)
- MsgId: CRTBKRTKHPPXXX1738280100444
- RmtInf: "Order cancelled - customer requested return" ⚠️ **NO "REVERSING" keyword!**

**Expected Bot Behavior:**

```
📥 Fetching transactions for TOURKHPPXXX...
   ✅ Found 1 transaction(s) for TOURKHPPXXX

🔗 CONTENT PAIRING: Transaction matched with original ID XXX
   Original: TOURKHPPXXX → BKRTKHPPXXX
   Current:  BKRTKHPPXXX → TOURKHPPXXX

🆕 NEW REVERSAL DETECTED!
💰 Amount: 250000 KHR
🔄 Forwarding reversal to NBCHQ: 250000 KHR to NBHQKHPPXXX (000000001111)
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.
   Linked to original transaction ID: XXX
```

---

## ✅ Verification

### Database Check:

```sql
-- Check the original transaction
SELECT * FROM transaction_logs WHERE trx_hash = 'CRTTOURKHPPXXX1738280000333';

-- Check the reversal transaction
SELECT * FROM transaction_logs WHERE trx_hash = 'CRTBKRTKHPPXXX1738280100444';

-- Verify pairing link
SELECT
  r.trx_hash as reversal_hash,
  r.amount as reversal_amount,
  r.debtor_bic as reversal_from,
  r.creditor_bic as reversal_to,
  o.trx_hash as original_hash,
  o.amount as original_amount,
  o.debtor_bic as original_from,
  o.creditor_bic as original_to
FROM transaction_logs r
LEFT JOIN transaction_logs o ON r.original_trx_id = o.id
WHERE r.trx_hash = 'CRTBKRTKHPPXXX1738280100444';
```

**Expected Result:**

| Field           | Value                       |
| --------------- | --------------------------- |
| reversal_hash   | CRTBKRTKHPPXXX1738280100444 |
| reversal_amount | 250000                      |
| reversal_from   | BKRTKHPPXXX                 |
| reversal_to     | TOURKHPPXXX                 |
| original_hash   | CRTTOURKHPPXXX1738280000333 |
| original_amount | 250000                      |
| original_from   | TOURKHPPXXX                 |
| original_to     | BKRTKHPPXXX                 |

---

## 🔄 Cleanup

To run this test again or remove test data:

```sql
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738280000333',
  'CRTBKRTKHPPXXX1738280100444'
);
```

---

## 🎯 What This Tests

✅ **Different Amount:** 250,000 KHR (vs 150,000 in Scenario 2)  
✅ **Different Reference IDs:** 7777666655 (vs 5555444433)  
✅ **Different Message IDs:** Ensures matching by content, not by ID patterns  
✅ **Content-Based Detection:** No "REVERSING" keyword, detected by pairing  
✅ **Database Linking:** Verifies original_trx_id foreign key relationship

---

## 📊 Comparison with Scenario 2

| Feature         | Scenario 2                                | Scenario 3                                    |
| --------------- | ----------------------------------------- | --------------------------------------------- |
| Amount          | 150,000 KHR                               | 250,000 KHR                                   |
| ext_ref         | 5555444433                                | 7777666655                                    |
| RmtInf (Step 2) | "Payment for goods - No reversal keyword" | "Order cancelled - customer requested return" |
| Use Case        | Basic content pairing test                | Verify with different amounts                 |

Both scenarios test the same feature but with different data to ensure robustness.

---

## 🎨 Quick Test Script

Save this as `test-scenario3.ps1`:

```powershell
# Scenario 3 - Content-Based Pairing Test

Write-Host "🧪 Testing Content-Based Pairing with 250,000 KHR" -ForegroundColor Cyan
Write-Host ""

# Step 1: Send original
Write-Host "📤 Step 1: Sending original TOUR → BKRT (250,000 KHR)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml"
Write-Host "✅ Sent!" -ForegroundColor Green
Write-Host ""

# Wait
Write-Host "⏳ Waiting 70 seconds for bot to process..." -ForegroundColor Yellow
Start-Sleep -Seconds 70

# Step 2: Send reversal
Write-Host "📤 Step 2: Sending reversal BKRT → TOUR (250,000 KHR, NO label)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml"
Write-Host "✅ Sent!" -ForegroundColor Green
Write-Host ""

Write-Host "🔍 Check bot logs for content pairing detection!" -ForegroundColor Cyan
Write-Host "Expected: 🔗 CONTENT PAIRING: Transaction matched with original ID XXX" -ForegroundColor Green
```

Run with:

```powershell
.\test-scenario3.ps1
```

---

## 🎯 Success Criteria

✅ **Test passes if:**

1. Step 1 transaction succeeds (200,000 KHR sent)
2. Bot stores it as original (check logs)
3. Step 2 transaction succeeds (no "REVERSING" label)
4. Bot detects content pairing (🔗 message in logs)
5. Bot forwards 250,000 KHR to NBCHQ
6. Database shows reversal linked to original
7. No duplicate processing on subsequent cycles

---

**Test ID:** SC3  
**Category:** Content-Based Pairing  
**Date:** 2026-01-30
