-- Delete the old transaction so it can be reprocessed with new NBCHQ forwarding logic
-- Transaction hash: 97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964

DELETE FROM transaction_logs 
WHERE trx_hash = '97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964';

-- Verify deletion
SELECT * FROM transaction_logs 
WHERE trx_hash = '97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964';
-- Should return 0 rows if successfully deleted
