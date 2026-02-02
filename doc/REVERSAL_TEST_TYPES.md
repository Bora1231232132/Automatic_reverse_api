# Reversal Transaction Test Types

## Type 1: pain.007.001.05 (Proper Reversal Format)

**File:** `test-type1-pain007.xml`
**Format:** ISO 20022 pain.007.001.05 (Customer Payment Reversal)
**Amount:** 150,000 KHR
**Method:** `makeReverseTransaction`

### Expected Console Output:

```
📋 Document Type: pain.007.001.05 (CstmrPmtRvsl) ✅ REVERSAL FORMAT
✅ REVERSAL DETECTED: pain.007.001.05 (CstmrPmtRvsl)
```

### Send Command:

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-type1-pain007.xml"
```

---

## Type 2: Keyword-Based Detection (REVERSING)

**File:** `test-type2-keyword.xml`
**Format:** ISO 20022 pain.001.001.05 with "REVERSING" keyword in RmtInf
**Amount:** 80,000 KHR
**Method:** `makeFullFundTransfer`
**Direction:** BKRT → TOUR

### Expected Console Output:

```
📋 Document Type: pain.001.001.05 (CstmrCdtTrfInitn)
✅ REVERSAL DETECTED: Keyword-based (REVERSING found in RmtInf)
📋 Direction: BKRTKHPPXXX → TOURKHPPXXX
✅ REVERSAL DETECTED: Direction-based (BKRT → TOUR)
```

### Send Command:

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-type2-keyword.xml"
```

---

## Type 3: Direction-Based Detection (BKRT → TOUR)

**File:** `test-type3-direction.xml`
**Format:** ISO 20022 pain.001.001.05 (regular credit transfer)
**Amount:** 90,000 KHR
**Method:** `makeFullFundTransfer`
**Direction:** BKRT → TOUR (no REVERSING keyword)

### Expected Console Output:

```
📋 Document Type: pain.001.001.05 (CstmrCdtTrfInitn)
📋 Direction: BKRTKHPPXXX → TOURKHPPXXX
✅ REVERSAL DETECTED: Direction-based (BKRT → TOUR)
```

### Send Command:

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-type3-direction.xml"
```

---

## Expected Bot Behavior (for NEW transactions):

After reversal detection, if the transaction is NOT in the database:

```
============================================================
🆕 NEW REVERSAL DETECTED!
============================================================
📝 Transaction XML: <?xml version...
📄 Step 2: Parsed Data. Hash: [hash] | Reversal? true
💰 Amount: [amount] KHR
🔑 Original MsgId: [msgId]
🔑 Original PmtInfId: [pmtInfId]
============================================================

🔎 Step 3.5: Skipping REST verification (not a 64-char blockchain hash)...
🔄 Forwarding reversal to NBCHQ: [amount] KHR to NBHQKHPPXXX (000000001111)
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.
```

---

## Test Order Recommendation:

1. **Test Type 3 first** (most common in production - direction-based)
2. **Test Type 2** (keyword-based - also common)
3. **Test Type 1** (proper pain.007 format - ideal but less common)

---

## Notes:

- All test files use unique reference IDs to avoid "INSTRUCTION_REF_ALREADY_EXISTS" errors
- Type 1 uses `makeReverseTransaction` endpoint
- Type 2 & 3 use `makeFullFundTransfer` endpoint
- All tests forward to NBCHQ (NBHQKHPPXXX / account: 000000001111)
