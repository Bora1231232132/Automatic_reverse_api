# Scenario 2: Content-Based Reversal Pairing

## 🎯 Overview

This scenario tests the **content-based reversal detection** feature, which identifies reversals by matching transaction content (amount, accounts, BIC codes) even when there's **no explicit "REVERSING" label**.

### 📋 Scenario Details

**Amount:** 150,000 KHR  
**Transaction Flow:** TOUR → BKRT → Bot stores original → BKRT → TOUR (no label) → Bot detects via content pairing

### 🔍 Key Feature

Unlike Scenario 1 which relies on:

- Direction-based detection (hardcoded BKRT → TOUR)
- "REVERSING" keyword

**Scenario 2 uses:**

- **Dual account monitoring**: Bot monitors BOTH TOUR and BKRT incoming transactions
- Content matching: Compares incoming transactions with stored originals
- Swapped debtor/creditor matching: If A sends to B, and later B sends to A with same amount → Reversal!

### 🎭 Dual Monitoring

The bot is configured to monitor incoming transactions for **multiple accounts**:

```env
BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX
```

This means:

- **TOUR → BKRT**: Bot sees it as incoming to BKRT ✅
- **BKRT → TOUR**: Bot sees it as incoming to TOUR ✅

This dual monitoring enables the bot to see transactions in both directions and perform content-based pairing!

---

## 🔄 Complete Flow

```
Step 1: TOUR sends 150,000 KHR to BKRT
   ↓
   Bot stores as ORIGINAL transaction (for future matching)
   ↓
Step 2: BKRT sends 150,000 KHR back to TOUR (NO "REVERSING" label)
   ↓
   Bot compares with stored originals
   ↓
   MATCH FOUND: Same amount + Swapped accounts
   ↓
   Bot marks as REVERSAL and forwards to NBCHQ
   ↓
   Bot saves to database (links to original transaction)
```

---

## ⚙️ Configuration Requirements

Before running this scenario, ensure your `.env.development` has:

```env
# Must monitor both accounts for content pairing to work
BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX
```

**Why both?**

- TOUR → BKRT is visible as "incoming to BKRT"
- BKRT → TOUR is visible as "incoming to TOUR"
- Without monitoring both, the bot won't see one direction!

---

## 📝 Step-by-Step Testing

### Step 1: Send Original Transfer (TOUR → BKRT)

**File:** `scenario2-step1-original.xml`

**Command:**

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml"
```

**Details:**

- From: TOURKHPPXXX (015039685739105)
- To: BKRTKHPPXXX (bkrtkhppxxx@bkrt)
- Amount: 150,000 KHR
- MsgId: CRTTOURKHPPXXX1738272000111
- ext_ref: 5555444433
- **Note:** No "REVERSING" keyword in RmtInf

**Expected Result:**

```xml
<return>Transaction sent successfully</return>
```

**Bot Behavior:**

The bot will **store this as an original transaction** for future matching:

```
📝 Stored original transaction for future pairing: CRTTOURKHPPXXX1738272000111
```

---

### Step 2: Send Reversal WITHOUT Label (BKRT → TOUR)

**File:** `scenario2-step2-reversal-no-label.xml`

**Command:**

```powershell
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml"
```

**Details:**

- From: BKRTKHPPXXX (bkrtkhppxxx@bkrt)
- To: TOURKHPPXXX (015039685739105)
- Amount: 150,000 KHR (same as original)
- MsgId: CRTBKRTKHPPXXX1738272100222
- ext_ref: 5555444433
- **RmtInf:** "Payment for goods - No reversal keyword" ⚠️ **NO "REVERSING" label!**

**Expected Result:**

```xml
<return>Transaction sent successfully</return>
```

---

### Step 3: Watch Bot Logs (Automatic)

**Timing:** Within 60 seconds after Step 2

**Expected Console Output:**

```
🔄 Step 1: Asking Bank for new transactions...
👀 Monitoring 2 payee code(s): TOURKHPPXXX, BKRTKHPPXXX

📥 Fetching transactions for TOURKHPPXXX...
   ⏹️  No transaction data for TOURKHPPXXX

📥 Fetching transactions for BKRTKHPPXXX...
   📝 RAW XML from BKRTKHPPXXX: <?xml version...
   ✅ Found 1 transaction(s) for BKRTKHPPXXX

📋 Total transactions to process: 1

📝 Stored original transaction for future pairing: CRTTOURKHPPXXX1738272000111

============================================================
📊 TRANSACTION SUMMARY
============================================================
Monitored Accounts: TOURKHPPXXX, BKRTKHPPXXX
Total Transactions: 1
Reversals Detected: 0
Already Processed: 0
New Reversals Forwarded to NBCHQ: 0
============================================================

... (wait 60 seconds, then on next cycle after Step 2) ...

🔄 Step 1: Asking Bank for new transactions...
👀 Monitoring 2 payee code(s): TOURKHPPXXX, BKRTKHPPXXX

📥 Fetching transactions for TOURKHPPXXX...
   📝 RAW XML from TOURKHPPXXX: <?xml version...
   ✅ Found 1 transaction(s) for TOURKHPPXXX

📥 Fetching transactions for BKRTKHPPXXX...
   ⏹️  No transaction data for BKRTKHPPXXX

📋 Total transactions to process: 1

🔗 CONTENT PAIRING: Transaction matched with original ID 123
   Original: TOURKHPPXXX → BKRTKHPPXXX
   Current:  BKRTKHPPXXX → TOURKHPPXXX

============================================================
🆕 NEW REVERSAL DETECTED!
============================================================
📝 Transaction XML: <?xml version...
📄 Step 2: Parsed Data. Hash: CRTBKRTKHPPXXX1738272100222 | Reversal? true
💰 Amount: 150000 KHR
🔑 Original MsgId: CRTBKRTKHPPXXX1738272100222
============================================================

🔎 Step 3.5: Skipping REST verification (not a 64-char blockchain hash)...
🔄 Forwarding reversal to NBCHQ: 150000 KHR to NBHQKHPPXXX (000000001111)
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.
   Linked to original transaction ID: 123

============================================================
📊 TRANSACTION SUMMARY
============================================================
Monitored Accounts: TOURKHPPXXX, BKRTKHPPXXX
Total Transactions: 1
Reversals Detected: 1
Already Processed: 0
New Reversals Forwarded to NBCHQ: 1
============================================================
```

**Key Indicators:**

✅ `🔗 CONTENT PAIRING: Transaction matched with original ID X`  
✅ `Linked to original transaction ID: X`

---

## 🔍 Matching Logic

The bot matches transactions using these criteria:

| Field            | Original (Step 1) | Reversal (Step 2) | Match Rule                                |
| ---------------- | ----------------- | ----------------- | ----------------------------------------- |
| Amount           | 150,000 KHR       | 150,000 KHR       | ✅ Exact match                            |
| Currency         | KHR               | KHR               | ✅ Exact match                            |
| Debtor BIC       | TOURKHPPXXX       | BKRTKHPPXXX       | ✅ Original.debtor = Rev.creditor         |
| Creditor BIC     | BKRTKHPPXXX       | TOURKHPPXXX       | ✅ Original.creditor = Rev.debtor         |
| Debtor Account   | 015039685739105   | bkrtkhppxxx@bkrt  | ✅ Original.debtor_acc = Rev.creditor_acc |
| Creditor Account | bkrtkhppxxx@bkrt  | 015039685739105   | ✅ Original.creditor_acc = Rev.debtor_acc |

**Result:** All criteria match → **Reversal detected!**

---

## ✅ Verification Checklist

After running the scenario, verify:

- [ ] Step 1: BKRT received 150,000 KHR from TOUR
- [ ] Bot stored the original transaction
- [ ] Step 2: TOUR received 150,000 KHR from BKRT (no "REVERSING" label)
- [ ] Bot detected content pairing match
- [ ] Bot forwarded 150,000 KHR to NBCHQ
- [ ] Database shows link between reversal and original

### Check Database:

```sql
-- Check the reversal transaction
SELECT * FROM transaction_logs WHERE trx_hash = 'CRTBKRTKHPPXXX1738272100222';

-- Check the original transaction
SELECT * FROM transaction_logs WHERE trx_hash = 'CRTTOURKHPPXXX1738272000111';

-- Verify the link
SELECT
  r.trx_hash as reversal_hash,
  r.amount as reversal_amount,
  o.trx_hash as original_hash,
  o.amount as original_amount,
  r.debtor_bic as reversal_from,
  o.debtor_bic as original_from
FROM transaction_logs r
LEFT JOIN transaction_logs o ON r.original_trx_id = o.id
WHERE r.trx_hash = 'CRTBKRTKHPPXXX1738272100222';
```

**Expected Result:**

| Column          | Value                       |
| --------------- | --------------------------- |
| reversal_hash   | CRTBKRTKHPPXXX1738272100222 |
| reversal_amount | 150000                      |
| original_hash   | CRTTOURKHPPXXX1738272000111 |
| original_amount | 150000                      |
| reversal_from   | BKRTKHPPXXX                 |
| original_from   | TOURKHPPXXX                 |

---

## 🔧 Troubleshooting

### Issue: Bot doesn't detect content pairing

**Check:**

1. Did Step 1 complete successfully?
2. Did bot store the original transaction? (Check logs for "Stored original transaction")
3. Wait 60+ seconds between Step 1 and Step 2 for bot to process Step 1
4. Check database: `SELECT * FROM transaction_logs WHERE trx_hash = 'CRTTOURKHPPXXX1738272000111';`

### Issue: Bot treats Step 2 as normal transaction (not reversal)

**Possible Causes:**

- Original transaction not stored (Step 1 failed)
- Amount mismatch (check both XMLs have 150000)
- Account mismatch (verify BIC codes and accounts are correctly swapped)

**Solution:**

```sql
-- Manually insert the original if needed
INSERT INTO transaction_logs (
  trx_hash, amount, currency, status,
  debtor_bic, creditor_bic,
  debtor_account, creditor_account,
  ext_ref, is_reversal
) VALUES (
  'CRTTOURKHPPXXX1738272000111', 150000, 'KHR', 'STORED',
  'TOURKHPPXXX', 'BKRTKHPPXXX',
  '015039685739105', 'bkrtkhppxxx@bkrt',
  'TOURKHPPXXX/BKRTKHPPXXX/5555444433', false
);
```

### Issue: Already processed

**Solution:**

```sql
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738272000111',
  'CRTBKRTKHPPXXX1738272100222'
);
```

---

## 🆚 Comparison with Scenario 1

| Feature                 | Scenario 1                     | Scenario 2                    |
| ----------------------- | ------------------------------ | ----------------------------- |
| **Detection Method**    | Direction-based (BKRT → TOUR)  | Content-based pairing         |
| **Requires Label?**     | No, but direction is hardcoded | No, matches by content        |
| **Works for any pair?** | Only BKRT ↔ TOUR               | ✅ Any debtor/creditor pair   |
| **Amount flexibility**  | Any amount                     | Must match exactly            |
| **Storage**             | No original storage needed     | Stores originals for matching |
| **Scalability**         | Limited to hardcoded pairs     | ✅ Scales to all transactions |

**Scenario 2 is more powerful** because it can detect reversals between ANY two parties, not just BKRT and TOUR.

---

## 🔄 Running Multiple Tests

To run this scenario again:

1. **Change the reference IDs** in both XML files:
   - `ext_ref`: Change `5555444433` to a new unique number
   - `MsgId`: Change timestamps to current time
2. **Or clear the database:**

   ```sql
   DELETE FROM transaction_logs WHERE trx_hash LIKE '%1738272%';
   ```

3. **Re-run** Steps 1 and 2

---

## 🎯 Success Criteria

✅ **Scenario passes if:**

1. Step 1 transaction succeeds and is stored as original
2. Step 2 transaction succeeds (no "REVERSING" label)
3. Bot detects content pairing match automatically
4. Bot forwards 150,000 KHR to NBCHQ
5. Database shows reversal linked to original transaction
6. No duplicate processing on subsequent cycles

---

## 📞 Support

If you encounter issues:

1. Check bot logs for content pairing messages
2. Verify database has original transaction stored
3. Ensure both transactions have matching amounts and currencies
4. Check BIC codes and accounts are correctly swapped
