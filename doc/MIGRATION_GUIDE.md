# Migration Guide: Content-Based Reversal Pairing

## 📋 Overview

This guide explains how to deploy the new **content-based reversal pairing** feature that was added to the Bakong Automation bot.

## 🆕 What's New?

The bot can now detect reversals by **matching transaction content** (amount, accounts, BIC codes), even without explicit "REVERSING" labels. This makes reversal detection more robust and scalable.

### New Detection Methods

**Before:**

1. pain.007 format (explicit reversal XML)
2. "REVERSING" keyword in RmtInf
3. Direction-based (hardcoded BKRT → TOUR)

**After (adds):** 4. ✨ **Content-based pairing** - Matches by transaction content

## 🔧 Deployment Steps

### Step 1: Run Database Migration

Execute the SQL migration to add new columns to `transaction_logs`:

```bash
# Connect to your PostgreSQL database
psql -U your_user -d your_database -f migrations/add-content-pairing-columns.sql
```

**Or manually:**

```sql
-- Add BIC codes for debtor and creditor
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS debtor_bic VARCHAR(11);
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS creditor_bic VARCHAR(11);

-- Add account identifiers
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS debtor_account VARCHAR(100);
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS creditor_account VARCHAR(100);

-- Add external reference
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS ext_ref VARCHAR(100);

-- Add reversal tracking flags
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT false;
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS original_trx_id INTEGER REFERENCES transaction_logs(id);

-- Create index for faster matching queries
CREATE INDEX IF NOT EXISTS idx_transaction_matching
ON transaction_logs(amount, currency, debtor_bic, creditor_bic, is_reversal)
WHERE is_reversal = false;
```

### Step 2: Verify Migration

Check that the new columns exist:

```sql
\d transaction_logs
```

Expected output should include:

```
Column            | Type          | Collation | Nullable | Default
------------------+---------------+-----------+----------+---------
...
debtor_bic        | varchar(11)   |           |          |
creditor_bic      | varchar(11)   |           |          |
debtor_account    | varchar(100)  |           |          |
creditor_account  | varchar(100)  |           |          |
ext_ref           | varchar(100)  |           |          |
is_reversal       | boolean       |           |          | false
original_trx_id   | integer       |           |          |
```

### Step 3: Update Environment Configuration

Update your `.env.development` (or `.env.production`) to monitor multiple accounts:

**Before:**

```env
BAKONG_PAYEE_CODE=TOURKHPPXXX
```

**After:**

```env
BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX
```

**Why?** Content-based pairing requires the bot to see transactions in **both directions**:

- TOUR → BKRT (visible as incoming to BKRT)
- BKRT → TOUR (visible as incoming to TOUR)

### Step 4: Restart the Bot

```bash
# Stop the bot
# (Press Ctrl+C if running in terminal, or stop via process manager)

# Rebuild (if needed)
npm run build

# Start the bot
npm run dev  # or npm start for production
```

### Step 5: Test with Scenario 2

Run the new test scenario to verify content-based pairing works:

```powershell
# Step 1: Send original transaction
Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml"

# Wait 60+ seconds for bot to process

# Step 2: Send reversal without label
Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -InFile "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml"

# Wait for bot to process (check logs)
```

**Expected Log Output:**

```
📝 Stored original transaction for future pairing: CRTTOURKHPPXXX1738272000111
...
🔗 CONTENT PAIRING: Transaction matched with original ID 123
   Original: TOURKHPPXXX → BKRTKHPPXXX
   Current:  BKRTKHPPXXX → TOURKHPPXXX
🆕 NEW REVERSAL DETECTED!
...
   Linked to original transaction ID: 123
```

## 📊 Database Schema Changes

### New Columns

| Column             | Type         | Purpose                                   |
| ------------------ | ------------ | ----------------------------------------- |
| `debtor_bic`       | VARCHAR(11)  | BIC code of sender institution            |
| `creditor_bic`     | VARCHAR(11)  | BIC code of receiver institution          |
| `debtor_account`   | VARCHAR(100) | Account identifier of sender              |
| `creditor_account` | VARCHAR(100) | Account identifier of receiver            |
| `ext_ref`          | VARCHAR(100) | External reference from transaction       |
| `is_reversal`      | BOOLEAN      | True if this is a reversal transaction    |
| `original_trx_id`  | INTEGER      | Links to original transaction if reversal |

### New Index

- `idx_transaction_matching` - Speeds up content pairing queries by indexing common matching criteria

## 🔍 How It Works

### Flow Diagram

```
Incoming Transaction
        ↓
   Parse XML
        ↓
   Has "REVERSING" or pain.007?
   /              \
 YES              NO
  ↓                ↓
Mark as      Try content matching:
Reversal     - Swap debtor/creditor
  ↓          - Match amount/currency
  |                ↓
  |         Match found?
  |        /            \
  |      YES            NO
  |       ↓              ↓
  |   Mark as      Store as
  |   Reversal     Original
  ↓       ↓              ↓
Forward    Forward     Done
to NBCHQ   to NBCHQ   (Wait for
  ↓         ↓         matching
Save to    Save to    reversal)
Database   Database
(link to
original)
```

### Matching Criteria

For a transaction B to match original A:

1. **Amount**: B.amount = A.amount
2. **Currency**: B.currency = A.currency
3. **Debtor BIC**: B.debtorBic = A.creditorBic (swapped)
4. **Creditor BIC**: B.creditorBic = A.debtorBic (swapped)
5. **Accounts** (optional): Debtor/creditor accounts also swapped

## 🧪 Testing

### Unit Test (Optional)

If you have a test suite, add tests for the new methods:

```typescript
// Test TransactionModel.findMatchingOriginal()
// Test TransactionModel.storeOriginal()
// Test content pairing detection in ReversalService
```

### Integration Test

Use the provided test scenarios:

- **Scenario 1**: Existing direction-based detection (still works)
- **Scenario 2**: New content-based pairing (new feature)

## 🔄 Rollback Plan

If you need to rollback:

### Step 1: Revert Code Changes

```bash
git revert <commit-hash>
```

### Step 2: Remove Database Changes (Optional)

**Note:** Only do this if you want to completely remove the new feature.

```sql
-- Remove index
DROP INDEX IF EXISTS idx_transaction_matching;

-- Remove columns
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS original_trx_id;
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS is_reversal;
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS ext_ref;
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS creditor_account;
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS debtor_account;
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS creditor_bic;
ALTER TABLE transaction_logs DROP COLUMN IF EXISTS debtor_bic;
```

**Better Alternative:** Keep the columns (they're nullable) and just revert the code. The old code will continue to work with the new schema.

## 📈 Performance Considerations

### Index Usage

The new index `idx_transaction_matching` speeds up content pairing queries:

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE indexname = 'idx_transaction_matching';
```

### Query Performance

Content pairing adds one additional query per non-reversal transaction:

- **Before:** 1 query (check if exists)
- **After:** 2 queries (check if exists + try matching)

Impact is minimal as the matching query is indexed and only runs for non-reversals.

## 🔐 Security Notes

- No new external dependencies added
- All database queries use parameterized statements (SQL injection safe)
- No changes to authentication or authorization logic

## 📞 Support

If you encounter issues:

1. **Check logs:** Look for "CONTENT PAIRING" or error messages
2. **Verify database:** Ensure migration ran successfully
3. **Test incrementally:** Run Scenario 1 first (should still work), then Scenario 2
4. **Check indexes:** Ensure `idx_transaction_matching` exists

## 📝 Changelog

### Added

- Content-based reversal pairing detection
- `TransactionModel.findMatchingOriginal()` method
- `TransactionModel.storeOriginal()` method
- Database columns for storing transaction details
- Scenario 2 test case for content pairing
- Database index for faster matching queries

### Changed

- `TransactionModel.create()` now accepts optional transaction details
- `ParsedReversal` interface includes BIC and account fields
- `ReversalService.processSingleTransaction()` includes content pairing logic

### Fixed

- N/A (new feature, no bug fixes)

---

**Version:** 2.0.0  
**Date:** 2026-01-30  
**Author:** Development Team
