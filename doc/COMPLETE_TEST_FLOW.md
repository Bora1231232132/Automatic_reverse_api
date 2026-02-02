# Complete Reversal Test Flow

## 🔄 Full Transaction Flow

```
TOUR → BKRT → Bot Detects → Bot Forwards → NBCHQ
```

### Step-by-Step:

1. **TOUR sends 150,000 KHR to BKRT** (makeFullFundTransfer)
2. **BKRT reverses back to TOUR** (pain.007 reversal)
3. **Bot detects the reversal** (via pain.007 format)
4. **Bot acknowledges and processes**
5. **Bot forwards 150,000 KHR to NBCHQ** (makeFullFundTransfer to account 000000001111)

---

## 📝 Test Type 1: pain.007.001.05 (Proper Reversal)

### Step 1: TOUR → BKRT (Initial Transfer)

**File:** `test-flow-type1-step1-tour-to-bkrt.xml`
**Amount:** 150,000 KHR
**From:** TOURKHPPXXX (015039685739105)
**To:** BKRTKHPPXXX (bkrtkhppxxx@bkrt)

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-flow-type1-step1-tour-to-bkrt.xml"
```

**Expected:** Transaction sent successfully from TOUR to BKRT

---

### Step 2: BKRT → TOUR (Reversal using pain.007)

**File:** `test-flow-type1-step2-bkrt-reverses.xml`
**Amount:** 150,000 KHR (same as original)
**Format:** pain.007.001.05 (proper reversal format)
**Original MsgId:** CRTTOURKHPPXXX1738267000111
**Original PmtInfId:** TOURKHPPXXX/BKRTKHPPXXX/1111111111

```powershell
# Wait 60 seconds for TOUR to receive the refund from BKRT
# Then send the reversal
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-flow-type1-step2-bkrt-reverses.xml"
```

**Expected Bot Console Output:**

```
📋 Document Type: pain.007.001.05 (CstmrPmtRvsl) ✅ REVERSAL FORMAT
✅ REVERSAL DETECTED: pain.007.001.05 (CstmrPmtRvsl)

============================================================
🆕 NEW REVERSAL DETECTED!
============================================================
📝 Transaction XML: <?xml version...
📄 Step 2: Parsed Data. Hash: CRTBKRTKHPPXXX1738267100111 | Reversal? true
💰 Amount: 150000 KHR
🔑 Original MsgId: CRTTOURKHPPXXX1738267000111
🔑 Original PmtInfId: TOURKHPPXXX/BKRTKHPPXXX/1111111111
============================================================

🔎 Step 3.5: Skipping REST verification (not a 64-char blockchain hash)...
🔄 Forwarding reversal to NBCHQ: 150000 KHR to NBHQKHPPXXX (000000001111)
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.
```

---

## 🎯 Complete Flow Summary

### What Happens:

1. **Manual Step:** TOUR sends 150,000 KHR to BKRT
   - BKRT receives the funds
2. **Manual Step:** BKRT reverses/refunds back to TOUR
   - Uses proper pain.007.001.05 reversal format
   - References original transaction IDs
3. **Bot Auto-Detects:** Within 60 seconds
   - Bot polls `getIncomingTransactions`
   - Detects pain.007 reversal format
   - Checks database (not already processed)
4. **Bot Auto-Forwards:** To NBCHQ
   - Sends 150,000 KHR to NBHQKHPPXXX
   - Account: 000000001111
   - Saves to database to prevent duplicates

---

## 🧪 How to Test:

```powershell
# Step 1: TOUR sends to BKRT
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-flow-type1-step1-tour-to-bkrt.xml"

# Wait for confirmation that BKRT received it (check BKRT's incoming queue)

# Step 2: BKRT reverses back to TOUR (use BKRT credentials)
# NOTE: You might need to manually trigger this from BKRT UI, or send via API
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-flow-type1-step2-bkrt-reverses.xml"

# Step 3: Watch your bot logs (within 60 seconds)
# Bot will automatically detect and forward to NBCHQ
```

---

## ⚠️ Important Notes:

1. **Credentials:**
   - Step 1 (TOUR → BKRT): Uses TOUR credentials (bora/B@ora123)
   - Step 2 (BKRT → TOUR): Uses BKRT credentials (soap1/P@ssw0rd123)
2. **Timing:**
   - Bot runs every 60 seconds
   - After Step 2, wait up to 60 seconds for bot to detect
3. **Transaction IDs:**
   - All IDs are unique to avoid "INSTRUCTION_REF_ALREADY_EXISTS" errors
   - Step 2 references Step 1's MsgId and PmtInfId
4. **Final Result:**
   - NBCHQ receives 150,000 KHR in account 000000001111
   - Transaction saved to database
   - No duplicate processing

---

## 🔍 Verification:

Check these to verify success:

1. ✅ BKRT received initial transfer (check BKRT incoming)
2. ✅ TOUR received reversal (check TOUR incoming)
3. ✅ Bot logs show detection and forwarding
4. ✅ NBCHQ received forwarded amount (check NBCHQ incoming)
5. ✅ Database has the transaction hash stored
