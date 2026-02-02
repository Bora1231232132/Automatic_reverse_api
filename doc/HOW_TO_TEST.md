# How to Test Content-Based Pairing

Follow these steps in order. Use one scenario (e.g. Scenario 2) for your first run.

---

## 1. Prerequisites

### 1.1 Run the database migration (once)

If you haven't already:

```powershell
# From project root, using psql (adjust user/db name if needed)
psql -U void_user -d nbc_intergration_db -f migrations/add-content-pairing-columns.sql
```

Or run the SQL manually in your DB client (pgAdmin, DBeaver, etc.) from `migrations/add-content-pairing-columns.sql`.

### 1.2 Confirm environment

In `.env.development` you should have:

```env
BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX
```

(You already have this.)

### 1.3 Start the bot

```powershell
cd d:\Work\bakong-automation
npm run dev
```

Leave this terminal open. You'll watch logs here.

---

## 2. Run the test (Scenario 2 – 150,000 KHR)

Use a **second** terminal (PowerShell) in the project root.

### Step 1: Send original transaction (TOUR → BKRT)

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml"
```

**Expected response:** Something like `<return>Transaction sent successfully</return>` (or your API’s success response).

**In the bot terminal (within ~60 seconds) you should see something like:**

```
👀 Monitoring 2 payee code(s): TOURKHPPXXX, BKRTKHPPXXX
📥 Fetching transactions for TOURKHPPXXX...
📥 Fetching transactions for BKRTKHPPXXX...
   ✅ Found 1 transaction(s) for BKRTKHPPXXX
📝 Stored original transaction for future pairing: CRTTOURKHPPXXX1738272000111
```

If you see **"Stored original transaction"** → Step 1 test passed.

### Step 2: Wait for the next bot cycle

Wait **at least 60–70 seconds** so the bot has run once and stored the original.

### Step 3: Send reversal (BKRT → TOUR, no "REVERSING" label)

```powershell
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml"
```

**In the bot terminal (within ~60 seconds) you should see something like:**

```
📥 Fetching transactions for TOURKHPPXXX...
   ✅ Found 1 transaction(s) for TOURKHPPXXX
🔗 CONTENT PAIRING: Transaction matched with original ID 123
   Original: TOURKHPPXXX → BKRTKHPPXXX
   Current:  BKRTKHPPXXX → TOURKHPPXXX
============================================================
🆕 NEW REVERSAL DETECTED!
============================================================
💰 Amount: 150000 KHR
🔄 Forwarding reversal to NBCHQ: 150000 KHR to NBHQKHPPXXX (000000001111)
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.
   Linked to original transaction ID: 123
```

If you see **"CONTENT PAIRING"** and **"Linked to original transaction ID"** → Step 2 test passed.

---

## 3. Verify in the database

Run:

```sql
-- Latest transactions
SELECT id, trx_hash, amount, debtor_bic, creditor_bic, is_reversal, original_trx_id, created_at
FROM transaction_logs
ORDER BY created_at DESC
LIMIT 5;
```

**You should see:**

1. One row for the **reversal** (e.g. `CRTBKRTKHPPXXX1738272100222`, amount 150000, `is_reversal = true`, `original_trx_id` = some number).
2. One row for the **original** (e.g. `CRTTOURKHPPXXX1738272000111`, amount 150000, `is_reversal = false`, `original_trx_id` = NULL).

**Check the link:**

```sql
SELECT
  r.trx_hash AS reversal_hash,
  r.amount   AS reversal_amount,
  o.trx_hash AS original_hash,
  o.amount   AS original_amount,
  r.original_trx_id
FROM transaction_logs r
LEFT JOIN transaction_logs o ON r.original_trx_id = o.id
WHERE r.trx_hash = 'CRTBKRTKHPPXXX1738272100222';
```

You should get one row with both hashes and `original_trx_id` pointing to the original row’s `id`.

---

## 4. Quick checklist

| Step | What you do                                  | What to check                                                          |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------- |
| 1    | Run migration                                | No SQL errors                                                          |
| 2    | `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX` | Present in `.env.development`                                          |
| 3    | `npm run dev`                                | Bot starts, no crash                                                   |
| 4    | Send Step 1 XML (TOUR→BKRT)                  | API success + in bot logs: "Stored original transaction"               |
| 5    | Wait 60–70 s                                 | —                                                                      |
| 6    | Send Step 2 XML (BKRT→TOUR)                  | In bot logs: "CONTENT PAIRING" and "Linked to original transaction ID" |
| 7    | Query `transaction_logs`                     | 2 rows (original + reversal), reversal has `original_trx_id` set       |

---

## 5. If nothing is stored (no original)

- **Bot doesn’t show "Stored original transaction"**
  - Confirm `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX` and restart the bot.
  - Confirm the **TOUR→BKRT** request went to the correct URL and returned success.
  - Check whether your SIT/Bakong actually returns that transaction when the bot calls getIncomingTransaction for **BKRT**. If the API returns nothing for BKRT, the bot will never see the original.
- **Migration:** Ensure all columns from `add-content-pairing-columns.sql` exist on `transaction_logs` (no INSERT errors in bot logs).

---

## 6. Run another scenario (optional)

Same pattern, different files:

**Scenario 3 (250,000 KHR):**

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml"
# Wait 60+ seconds
# Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml"
```

**Scenario 4 (50,000 KHR):** Same idea, use files under `test-scenarios/scenario4-small-amount/`.

---

## 7. Cleanup before re-testing

To run the same scenario again without "Already processed":

```sql
DELETE FROM transaction_logs
WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738272000111',
  'CRTBKRTKHPPXXX1738272100222'
);
```

Then repeat from Step 1 (send original, wait, send reversal).
