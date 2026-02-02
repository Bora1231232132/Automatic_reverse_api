# Test Scenarios Overview

Complete guide to all available test scenarios for the Bakong Automation Bot.

---

## 📊 Scenarios Summary

| Scenario       | Type            | Amount      | Detection Method      | Purpose                            |
| -------------- | --------------- | ----------- | --------------------- | ---------------------------------- |
| **Scenario 1** | Direction-Based | 200,000 KHR | Direction (BKRT→TOUR) | Existing direction-based detection |
| **Scenario 2** | Content Pairing | 150,000 KHR | Content matching      | Basic content pairing test         |
| **Scenario 3** | Content Pairing | 250,000 KHR | Content matching      | Large amount pairing test          |
| **Scenario 4** | Content Pairing | 50,000 KHR  | Content matching      | Small amount pairing test          |

---

## 🎯 Scenario Details

### Scenario 1: Direction-Based Detection (Original)

**Location:** `test-scenarios/scenario1-step1-tour-to-bkrt.xml`, `scenario1-step2-bkrt-refunds.xml`

**Features Tested:**

- ✅ Hardcoded direction detection (BKRT → TOUR)
- ✅ Works without content pairing
- ✅ Requires specific direction

**Quick Test:**

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario1-step1-tour-to-bkrt.xml"

# Wait 60s, then Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario1-step2-bkrt-refunds.xml"
```

**Configuration Required:**

- Standard single monitoring: `BAKONG_PAYEE_CODE=TOURKHPPXXX`

---

### Scenario 2: Content-Based Pairing (150K)

**Location:** `test-scenarios/scenario2-content-pairing/`

**Features Tested:**

- ✅ Dual account monitoring
- ✅ Content-based pairing
- ✅ No "REVERSING" label needed
- ✅ Swapped debtor/creditor matching

**Quick Test:**

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml"

# Wait 60s, then Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml"
```

**Configuration Required:**

- Dual monitoring: `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX`

**Transaction IDs:**

- Original: `CRTTOURKHPPXXX1738272000111`
- Reversal: `CRTBKRTKHPPXXX1738272100222`
- ext_ref: `5555444433`

---

### Scenario 3: Content Pairing Large Amount (250K)

**Location:** `test-scenarios/scenario3-content-pairing-test2/`

**Features Tested:**

- ✅ Same as Scenario 2
- ✅ Different amount (250,000 KHR)
- ✅ Verifies robustness

**Quick Test:**

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml"

# Wait 60s, then Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml"
```

**Configuration Required:**

- Dual monitoring: `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX`

**Transaction IDs:**

- Original: `CRTTOURKHPPXXX1738280000333`
- Reversal: `CRTBKRTKHPPXXX1738280100444`
- ext_ref: `7777666655`

---

### Scenario 4: Content Pairing Small Amount (50K)

**Location:** `test-scenarios/scenario4-small-amount/`

**Features Tested:**

- ✅ Same as Scenario 2 & 3
- ✅ Smaller amount (50,000 KHR)
- ✅ Edge case testing

**Quick Test:**

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step1-original.xml"

# Wait 60s, then Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step2-reversal-no-label.xml"
```

**Configuration Required:**

- Dual monitoring: `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX`

**Transaction IDs:**

- Original: `CRTTOURKHPPXXX1738285000555`
- Reversal: `CRTBKRTKHPPXXX1738285100666`
- ext_ref: `3333222211`

---

## 🚀 Quick Test All Scenarios

Save this as `test-all-scenarios.ps1`:

```powershell
# Test All Content Pairing Scenarios

Write-Host "🧪 Testing All Content-Based Pairing Scenarios" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Scenario 2: 150K
Write-Host "📋 Scenario 2: 150,000 KHR" -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml"
Start-Sleep -Seconds 70
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml"
Write-Host "✅ Scenario 2 Complete" -ForegroundColor Green
Start-Sleep -Seconds 5

# Scenario 3: 250K
Write-Host ""
Write-Host "📋 Scenario 3: 250,000 KHR" -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml"
Start-Sleep -Seconds 70
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml"
Write-Host "✅ Scenario 3 Complete" -ForegroundColor Green
Start-Sleep -Seconds 5

# Scenario 4: 50K
Write-Host ""
Write-Host "📋 Scenario 4: 50,000 KHR" -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step1-original.xml"
Start-Sleep -Seconds 70
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step2-reversal-no-label.xml"
Write-Host "✅ Scenario 4 Complete" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 All scenarios tested!" -ForegroundColor Cyan
Write-Host "Check bot logs and database for results" -ForegroundColor Yellow
```

---

## 🔍 Verification SQL

```sql
-- View all test transactions
SELECT
  trx_hash,
  amount,
  debtor_bic,
  creditor_bic,
  is_reversal,
  original_trx_id,
  created_at
FROM transaction_logs
WHERE trx_hash LIKE '%1738%'
ORDER BY created_at DESC;

-- Count by scenario
SELECT
  CASE
    WHEN amount = 150000 THEN 'Scenario 2 (150K)'
    WHEN amount = 250000 THEN 'Scenario 3 (250K)'
    WHEN amount = 50000 THEN 'Scenario 4 (50K)'
    WHEN amount = 200000 THEN 'Scenario 1 (200K)'
  END as scenario,
  COUNT(*) as transactions,
  SUM(CASE WHEN is_reversal THEN 1 ELSE 0 END) as reversals,
  SUM(CASE WHEN NOT is_reversal THEN 1 ELSE 0 END) as originals
FROM transaction_logs
WHERE trx_hash LIKE '%1738%'
GROUP BY amount
ORDER BY amount;

-- View pairing relationships
SELECT
  o.trx_hash as original_trx,
  o.amount as original_amt,
  o.debtor_bic as original_from,
  o.creditor_bic as original_to,
  r.trx_hash as reversal_trx,
  r.amount as reversal_amt,
  r.debtor_bic as reversal_from,
  r.creditor_bic as reversal_to
FROM transaction_logs r
INNER JOIN transaction_logs o ON r.original_trx_id = o.id
WHERE r.is_reversal = true
ORDER BY r.created_at DESC;
```

---

## 🧹 Cleanup All Test Data

```sql
-- Remove all test transactions
DELETE FROM transaction_logs WHERE trx_hash LIKE '%1738%';

-- Or by scenario:

-- Scenario 1 (200K)
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738268500999',
  'CRTBKRTKHPPXXX1738268600999'
);

-- Scenario 2 (150K)
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738272000111',
  'CRTBKRTKHPPXXX1738272100222'
);

-- Scenario 3 (250K)
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738280000333',
  'CRTBKRTKHPPXXX1738280100444'
);

-- Scenario 4 (50K)
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738285000555',
  'CRTBKRTKHPPXXX1738285100666'
);
```

---

## 📝 Test Checklist

Before testing:

- [ ] Database migration completed
- [ ] `.env.development` has `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX`
- [ ] Bot is running (`npm run dev`)
- [ ] Database is accessible

For each scenario:

- [ ] Step 1 transaction succeeds
- [ ] Bot stores original (check logs)
- [ ] Wait 60+ seconds
- [ ] Step 2 transaction succeeds
- [ ] Bot detects content pairing (check logs: "🔗 CONTENT PAIRING")
- [ ] Bot forwards to NBCHQ (check logs)
- [ ] Database shows both transactions
- [ ] Reversal is linked to original (`original_trx_id` is set)

---

## 🎯 Expected Log Patterns

### Scenario 2, 3, 4 (Content Pairing):

**After Step 1:**

```
📥 Fetching transactions for BKRTKHPPXXX...
   ✅ Found 1 transaction(s) for BKRTKHPPXXX
📝 Stored original transaction for future pairing: CRTTOURKHPPXXX...
```

**After Step 2:**

```
📥 Fetching transactions for TOURKHPPXXX...
   ✅ Found 1 transaction(s) for TOURKHPPXXX
🔗 CONTENT PAIRING: Transaction matched with original ID XXX
   Original: TOURKHPPXXX → BKRTKHPPXXX
   Current:  BKRTKHPPXXX → TOURKHPPXXX
🆕 NEW REVERSAL DETECTED!
💰 Amount: [amount] KHR
🔄 Forwarding reversal to NBCHQ
🚀 Step 4: Forwarded Transaction Sent to NBCHQ.
💾 Step 5: Saved to Database. Cycle Complete.
   Linked to original transaction ID: XXX
```

---

## 📞 Troubleshooting

### No content pairing detected?

1. Check dual monitoring is enabled: `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX`
2. Verify original was stored (check logs after Step 1)
3. Check database: `SELECT * FROM transaction_logs WHERE is_reversal = false;`
4. Ensure amounts match exactly

### Original not being stored?

1. Verify bot is monitoring BKRTKHPPXXX: Check logs for "Fetching transactions for BKRTKHPPXXX"
2. Check transaction has BIC codes (required for storage)
3. Look for error messages in logs

### Bot not seeing transactions?

1. Check bot is running: `npm run dev`
2. Verify API endpoints are correct in `.env.development`
3. Check network connectivity
4. Wait full 60 seconds (cron cycle)

---

**Last Updated:** 2026-01-30  
**Version:** 2.1.0
