# Run tests – PowerShell scripts by reversal type

Use these folders to test each **reversal detection type** from PowerShell. Each run uses a unique `ext_ref`.

---

## By detection type

| Folder                     | Detection                                    | Step 2 RmtInf        |
| -------------------------- | -------------------------------------------- | -------------------- |
| **with-reversing-keyword** | Bot checks `RmtInf` for "REVERSING"          | Contains "REVERSING" |
| **no-keyword**             | Direction (BKRT→TOUR) and/or content pairing | No "REVERSING"       |

---

## By amount (no keyword)

| Folder              | Amount      |
| ------------------- | ----------- |
| **scenario-2-150k** | 150,000 KHR |
| **scenario-3-250k** | 250,000 KHR |
| **scenario-4-50k**  | 50,000 KHR  |

---

## Run from PowerShell

**From project root** (`D:\Work\bakong-automation`):

```powershell
# Reversal WITH "REVERSING" keyword in message
.\run-tests\with-reversing-keyword\run.ps1

# Reversal with NO keyword (direction / content pairing)
.\run-tests\no-keyword\run.ps1

# Same no-keyword flow, different amounts
.\run-tests\scenario-2-150k\run.ps1
.\run-tests\scenario-3-250k\run.ps1
.\run-tests\scenario-4-50k\run.ps1
```

**From inside a folder:**

```powershell
cd run-tests\with-reversing-keyword
.\run.ps1
```

```powershell
cd run-tests\no-keyword
.\run.ps1
```

---

## What each test does

- **with-reversing-keyword**  
  Step 1: TOUR→BKRT. Step 2: BKRT→TOUR with `RmtInf`: "REVERSING - Refund...".  
  Bot treats as reversal because `rmtInf.includes("REVERSING")`.

- **no-keyword**  
  Step 1: TOUR→BKRT. Step 2: BKRT→TOUR with `RmtInf`: "Payment for goods - No reversal keyword".  
  Bot treats as reversal by direction (BKRT→TOUR) and/or by matching a stored original (content pairing).

- **scenario-2-150k / scenario-3-250k / scenario-4-50k**  
  Same no-keyword flow as above, with different amounts (150K, 250K, 50K).

---

## Prerequisites

- Bot running: `npm run dev`
- `BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX` in `.env.development`
- Migration applied (content-pairing columns on `transaction_logs`)
