# Quick Reference - Content Pairing Test Scenarios

## ⚡ Quick Test Commands

### Scenario 2: 150,000 KHR

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml"

# Wait 60s

# Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml"
```

### Scenario 3: 250,000 KHR

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml"

# Wait 60s

# Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml"
```

### Scenario 4: 50,000 KHR

```powershell
# Step 1
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step1-original.xml"

# Wait 60s

# Step 2
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step2-reversal-no-label.xml"
```

---

## 📊 Scenarios At A Glance

| #   | Amount | ext_ref    | Original MsgId        | Reversal MsgId        |
| --- | ------ | ---------- | --------------------- | --------------------- |
| 2   | 150K   | 5555444433 | CRTTOURKHPPXXX...0111 | CRTBKRTKHPPXXX...0222 |
| 3   | 250K   | 7777666655 | CRTTOURKHPPXXX...0333 | CRTBKRTKHPPXXX...0444 |
| 4   | 50K    | 3333222211 | CRTTOURKHPPXXX...0555 | CRTBKRTKHPPXXX...0666 |

---

## 🔍 Quick Verification

```sql
-- Check latest transactions
SELECT trx_hash, amount, is_reversal, original_trx_id
FROM transaction_logs
ORDER BY created_at DESC
LIMIT 10;

-- Check specific scenario (replace amount)
SELECT * FROM transaction_logs WHERE amount = 150000;
```

---

## 🧹 Quick Cleanup

```sql
-- Scenario 2
DELETE FROM transaction_logs WHERE amount = 150000 AND trx_hash LIKE '%1738%';

-- Scenario 3
DELETE FROM transaction_logs WHERE amount = 250000 AND trx_hash LIKE '%1738%';

-- Scenario 4
DELETE FROM transaction_logs WHERE amount = 50000 AND trx_hash LIKE '%1738%';

-- All test scenarios
DELETE FROM transaction_logs WHERE trx_hash LIKE '%1738%';
```

---

## ✅ Success Indicators

**Look for in logs:**

- `👀 Monitoring 2 payee code(s): TOURKHPPXXX, BKRTKHPPXXX`
- `📝 Stored original transaction for future pairing`
- `🔗 CONTENT PAIRING: Transaction matched with original ID`
- `✅ Forwarded to NBCHQ`
- `Linked to original transaction ID: XXX`

---

## ⚙️ Required Config

```env
BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX
```
