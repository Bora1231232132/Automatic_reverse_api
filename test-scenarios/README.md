# Test Scenarios for Bakong Reversal Bot

## 🎯 Scenario 1: Complete TOUR → BKRT → NBCHQ Flow

This scenario tests the full reversal detection and forwarding flow.

### 📋 Scenario Details

**Amount:** 200,000 KHR  
**Transaction Flow:** TOUR → BKRT → Bot detects → Bot forwards → NBCHQ

### 🔄 Complete Flow

```
Step 1: TOUR sends 200,000 KHR to BKRT (makeFullFundTransfer)
   ↓
Step 2: BKRT refunds 200,000 KHR back to TOUR (makeFullFundTransfer)
   ↓
Step 3: Bot detects reversal (Direction: BKRT → TOUR)
   ↓
Step 4: Bot forwards 200,000 KHR to NBCHQ (account: 000000001111)
   ↓
Step 5: Bot saves to database (prevents duplicates)
```

---

## 📝 Step-by-Step Testing

### Step 1: Send Initial Transfer (TOUR → BKRT)

**File:** `scenario1-step1-tour-to-bkrt.xml`

**Command:**

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario1-step1-tour-to-bkrt.xml"
```

**Details:**

- From: TOURKHPPXXX (015039685739105)
- To: BKRTKHPPXXX (bkrtkhppxxx@bkrt)
- Amount: 200,000 KHR
- MsgId: CRTTOURKHPPXXX1738268500999
- ext_ref: 9999888877

**Expected Result:**

```xml
<return>Transaction sent successfully</return>
```

---

### Step 2: BKRT Refunds Back to TOUR (Direction-Based Detection)

**File:** `scenario1-step2-bkrt-refunds.xml`

**Command:**

```powershell
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario1-step2-bkrt-refunds.xml"
```

**Details:**

- **Format:** pain.001.001.05 (Customer Credit Transfer)
- **Endpoint:** `makeFullFundTransfer`
- **Detection:** Direction-based (BKRT → TOUR = Reversal ✅)
- From: BKRTKHPPXXX (bkrtkhppxxx@bkrt)
- To: TOURKHPPXXX (015039685739105)
- Amount: 200,000 KHR (same as original)
- MsgId: CRTBKRTKHPPXXX1738268600999
- ext_ref: 9999888877R

**Why This Approach:**

- `makeReverseTransaction` endpoint has issues in SIT (Premature end of file error)
- Uses working `makeFullFundTransfer` endpoint
- Bot detects as reversal via direction: BKRTKHPPXXX → TOURKHPPXXX
- Works independently without requiring original transaction lookup

**Expected Result:**

```xml
<return>Transaction sent successfully</return>
```

**Note:** Bot will detect this as reversal via **Direction: BKRTKHPPXXX → TOURKHPPXXX**!

---

### Step 3: Watch Bot Logs (Automatic)

**Timing:** Within 60 seconds after Step 2

**Expected Console Output:**

```
🔄 Step 1: Asking Bank for new transactions...
📝 RAW XML from NBC: <?xml version...
📋 Found X transaction(s) in response

📋 Document Type: pain.001.001.05 (CstmrCdtTrfInitn)
📋 Direction: BKRTKHPPXXX → TOURKHPPXXX
✅ REVERSAL DETECTED: Direction-based (BKRT → TOUR)

============================================================
🆕 NEW REVERSAL DETECTED!
============================================================
📝 Transaction XML: <?xml version...
📄 Step 2: Parsed Data. Hash: CRTBKRTKHPPXXX1738268600999 | Reversal? true
💰 Amount: 200000 KHR
🔑 Original MsgId: CRTTOURKHPPXXX1738268500999
🔑 Original PmtInfId: TOURKHPPXXX/BKRTKHPPXXX/9999888877
============================================================

🔎 Step 3.5: Skipping REST verification (not a 64-char blockchain hash)...
🔄 Forwarding reversal to NBCHQ: 200000 KHR to NBHQKHPPXXX (000000001111)
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.

============================================================
📊 TRANSACTION SUMMARY
============================================================
Total Transactions: X
Reversals Detected: X
Already Processed: X
New Reversals Forwarded to NBCHQ: 1
============================================================
```

**Note:** Bot will detect this as reversal via **Direction: BKRTKHPPXXX → TOURKHPPXXX**!

---

## ✅ Verification Checklist

After running the scenario, verify:

- [ ] Step 1: BKRT received 200,000 KHR from TOUR
- [ ] Step 2: TOUR received 200,000 KHR refund from BKRT
- [ ] Step 3: Bot detected the reversal (check logs)
- [ ] Step 4: NBCHQ received 200,000 KHR (account: 000000001111)
- [ ] Step 5: Transaction saved to database (no duplicate processing)

### Check Database:

```sql
SELECT * FROM transaction_logs WHERE trx_hash = 'CRTBKRTKHPPXXX1738268600999';
```

Should return 1 row with:

- trx_hash: CRTBKRTKHPPXXX1738268600999
- amount: 200000
- currency: KHR
- status: SUCCESS

---

## 🔍 Troubleshooting

### Issue: Bot doesn't detect reversal

**Check:**

1. Is bot running? (`npm run dev`)
2. Is `BAKONG_PAYEE_CODE=TOURKHPPXXX` in `.env.development`?
3. Wait full 60 seconds for next cron cycle
4. Check bot logs for errors

### Issue: Already processed

**Solution:**

```sql
DELETE FROM transaction_logs WHERE trx_hash = 'CRTBKRTKHPPXXX1738268600999';
```

Then wait for next bot cycle.

### Issue: 404 error

**Check:**

- TOUR URL (Step 1): `http://10.20.6.228/BakongWebService/NBCInterface`
- BKRT URL (Step 2): `http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface`
- Using correct credentials: `bora` / `B@ora123`

---

## 📊 Expected Database Entry

After successful processing:

| Field      | Value                       |
| ---------- | --------------------------- |
| trx_hash   | CRTBKRTKHPPXXX1738268600999 |
| amount     | 200000                      |
| currency   | KHR                         |
| status     | SUCCESS                     |
| created_at | (timestamp)                 |

---

## 🎯 Success Criteria

✅ **Scenario passes if:**

1. Both Step 1 and Step 2 transactions succeed
2. Bot detects the reversal automatically
3. Bot forwards 200,000 KHR to NBCHQ
4. Transaction is saved to database
5. No duplicate processing on subsequent cycles

---

## 🔄 Running Multiple Tests

To run this scenario again:

1. **Change the reference IDs** in both XML files:
   - `ext_ref`: Change `9999888877` to a new unique number
   - `MsgId`: Change timestamps to current time
2. **Or clear the database:**

   ```sql
   DELETE FROM transaction_logs WHERE trx_hash LIKE 'CRTBKRTKHPPXXX%';
   ```

3. **Re-run** Steps 1 and 2

---

## 📞 Support

If you encounter issues:

1. Check bot logs in terminal
2. Verify `.env.development` configuration
3. Ensure database is running
4. Check network connectivity to Bakong API
