-- Migration: Add columns for content-based reversal pairing
-- Description: Extends transaction_logs table to store transaction details for matching reversals by content

-- Add BIC codes for debtor and creditor
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS debtor_bic VARCHAR(11);
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS creditor_bic VARCHAR(11);

-- Add account identifiers
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS debtor_account VARCHAR(100);
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS creditor_account VARCHAR(100);

-- Add external reference (from ext_ref or PmtInfId)
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS ext_ref VARCHAR(100);

-- Add reversal tracking flags
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT false;
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS original_trx_id INTEGER REFERENCES transaction_logs(id);

-- Create index for faster matching queries
CREATE INDEX IF NOT EXISTS idx_transaction_matching 
ON transaction_logs(amount, currency, debtor_bic, creditor_bic, is_reversal) 
WHERE is_reversal = false;

-- Add comments for documentation
COMMENT ON COLUMN transaction_logs.debtor_bic IS 'BIC code of the debtor (sender) institution';
COMMENT ON COLUMN transaction_logs.creditor_bic IS 'BIC code of the creditor (receiver) institution';
COMMENT ON COLUMN transaction_logs.debtor_account IS 'Account identifier of the debtor';
COMMENT ON COLUMN transaction_logs.creditor_account IS 'Account identifier of the creditor';
COMMENT ON COLUMN transaction_logs.ext_ref IS 'External reference from PmtInfId or ext_ref field';
COMMENT ON COLUMN transaction_logs.is_reversal IS 'True if this transaction is a reversal';
COMMENT ON COLUMN transaction_logs.original_trx_id IS 'References the original transaction if this is a reversal';
