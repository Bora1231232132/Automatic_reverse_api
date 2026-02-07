import pool from "../config/db";

/** One row in transaction_logs (reversal or stored original) */
export interface Transaction {
  id?: number;
  trx_hash: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: Date;
  debtor_bic?: string;
  creditor_bic?: string;
  debtor_account?: string;
  creditor_account?: string;
  ext_ref?: string;
  is_reversal?: boolean;
  original_trx_id?: number;
}

/** Criteria to find a matching original (for content pairing) */
export interface MatchingCriteria {
  amount: number;
  currency: string;
  debtorBic: string;
  creditorBic: string;
  debtorAccount?: string | undefined;
  creditorAccount?: string | undefined;
}

export const TransactionModel = {
  /** Return true if a row with this trx_hash exists */
  async exists(hash: string): Promise<boolean> {
    const result = await pool.query(
      "SELECT 1 FROM transaction_logs WHERE trx_hash = $1",
      [hash],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  },

  /** Get one transaction by trx_hash, or null */
  async getByHash(hash: string): Promise<Transaction | null> {
    const result = await pool.query(
      "SELECT * FROM transaction_logs WHERE trx_hash = $1",
      [hash],
    );
    return result.rows[0] || null;
  },

  /** Insert a reversal row (status PENDING, SUCCESS, or ACK_SENT; optional BICs, accounts, original_trx_id) */
  async create(
    hash: string,
    amount: number,
    currency: string,
    status: "PENDING" | "SUCCESS" | "ACK_SENT",
    options?: {
      debtorBic?: string | undefined;
      creditorBic?: string | undefined;
      debtorAccount?: string | undefined;
      creditorAccount?: string | undefined;
      extRef?: string | undefined;
      isReversal?: boolean | undefined;
      originalTrxId?: number | undefined;
    },
  ): Promise<Transaction> {
    const query = `
    INSERT INTO transaction_logs (
      trx_hash, amount, currency, status,
      debtor_bic, creditor_bic, debtor_account, creditor_account,
      ext_ref, is_reversal, original_trx_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
    `;
    const values = [
      hash,
      amount,
      currency,
      status,
      options?.debtorBic || null,
      options?.creditorBic || null,
      options?.debtorAccount || null,
      options?.creditorAccount || null,
      options?.extRef || null,
      options?.isReversal || false,
      options?.originalTrxId || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /** Set status for a row by trx_hash (e.g. PENDING → SUCCESS after forward) */
  async updateStatus(trxHash: string, status: string): Promise<void> {
    await pool.query(
      "UPDATE transaction_logs SET status = $2 WHERE trx_hash = $1",
      [trxHash, status],
    );
  },

  /** Insert an original (non-reversal) transaction for content pairing; ignore if trx_hash already exists */
  async storeOriginal(
    hash: string,
    amount: number,
    currency: string,
    debtorBic: string,
    creditorBic: string,
    debtorAccount?: string,
    creditorAccount?: string,
    extRef?: string,
  ): Promise<Transaction> {
    const query = `
    INSERT INTO transaction_logs (
      trx_hash, amount, currency, status,
      debtor_bic, creditor_bic, debtor_account, creditor_account,
      ext_ref, is_reversal
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
    ON CONFLICT (trx_hash) DO NOTHING
    RETURNING *;
    `;
    const values = [
      hash,
      amount,
      currency,
      "STORED",
      debtorBic,
      creditorBic,
      debtorAccount || null,
      creditorAccount || null,
      extRef || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /** Find latest non-reversal with same amount, currency, debtor/creditor BICs (and optionally accounts) */
  async findMatchingOriginal(
    criteria: MatchingCriteria,
  ): Promise<Transaction | null> {
    let query = `
    SELECT * FROM transaction_logs
    WHERE amount = $1
      AND currency = $2
      AND debtor_bic = $3
      AND creditor_bic = $4
      AND is_reversal = false
    `;

    const values: any[] = [
      criteria.amount,
      criteria.currency,
      criteria.debtorBic,
      criteria.creditorBic,
    ];

    if (criteria.debtorAccount) {
      query += ` AND debtor_account = $${values.length + 1}`;
      values.push(criteria.debtorAccount);
    }

    if (criteria.creditorAccount) {
      query += ` AND creditor_account = $${values.length + 1}`;
      values.push(criteria.creditorAccount);
    }

    query += " ORDER BY created_at DESC LIMIT 1;";

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },
};
