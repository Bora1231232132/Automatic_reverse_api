# Scenario 4: Small Amount Content Pairing

## 🎯 Overview

Tests content-based pairing with a **smaller transaction amount** (50,000 KHR). This verifies the feature works consistently across different transaction sizes.

### 📋 Scenario Details

**Amount:** 50,000 KHR (smallest test amount)  
**ext_ref:** 3333222211  
**Use Case:** Small retail transaction reversal

---

## 📝 Quick Test

### Step 1: Original Transaction (TOUR → BKRT)

```powershell
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step1-original.xml"
```

**Wait 60+ seconds**

### Step 2: Reversal (BKRT → TOUR, no label)

```powershell
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario4-small-amount/scenario4-step2-reversal-no-label.xml"
```

---

## ✅ Expected Result

Bot should detect content pairing and forward 50,000 KHR to NBCHQ.

```
🔗 CONTENT PAIRING: Transaction matched with original ID XXX
💰 Amount: 50000 KHR
✅ Forwarded to NBCHQ
```

---

## 🔍 Verification

```sql
SELECT * FROM transaction_logs
WHERE trx_hash IN ('CRTTOURKHPPXXX1738285000555', 'CRTBKRTKHPPXXX1738285100666')
ORDER BY created_at;
```

---

## 🧹 Cleanup

```sql
DELETE FROM transaction_logs WHERE trx_hash IN (
  'CRTTOURKHPPXXX1738285000555',
  'CRTBKRTKHPPXXX1738285100666'
);
```
