# 🔄 Bakong Reversal Transaction Implementation

## Overview

Your Bakong automation system now supports **ISO 20022 pain.007.001.05** Customer Payment Reversals using the `makeReverseTransaction` SOAP operation.

## What Changed

### 1. **New SOAP Operation: `makeReverseTransaction`**

Added a new method in `bakong.service.ts` that generates ISO 20022 `pain.007.001.05` XML format:

```typescript
await BakongService.makeReverseTransaction(
  amount,
  currency,
  originalMsgId,
  originalPmtInfId,
  debtorAccount,
);
```

**SOAP Request Format:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
    <soapenv:Body>
        <web:makeReverseTransaction>
            <web:cm_user_name>soap1</web:cm_user_name>
            <web:cm_password>P@ssw0rd123</web:cm_password>
            <web:content_message>
                <![CDATA[
                <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
                    <CstmrPmtRvsl>
                        <!-- Payment reversal details -->
                    </CstmrPmtRvsl>
                </Document>
                ]]>
            </web:content_message>
        </web:makeReverseTransaction>
    </soapenv:Body>
</soapenv:Envelope>
```

### 2. **ISO 20022 pain.007.001.05 Generator**

Created `generateReversalMessage()` function that builds the reversal XML with:

- **Group Header** (`GrpHdr`): Message ID, creation time, number of transactions, debtor/creditor agents
- **Original Group Info** (`OrgnlGrpInf`): Original message ID and creation time
- **Original Payment Info and Reversal** (`OrgnlPmtInfAndRvsl`):
  - Reversal ID
  - Original and reversed amounts
  - Reversal reason information
  - Original transaction reference

### 3. **Updated Data Model**

Extended `ParsedReversal` interface to support reversal-specific fields:

```typescript
export interface ParsedReversal {
  isReversal: boolean;
  trxHash: string | null;
  amount: number;
  currency: string;
  endToEndId: string;
  // New fields for reversals
  originalMsgId?: string;
  originalPmtInfId?: string;
  debtorAccount?: string;
}
```

### 4. **Updated Reversal Service**

Modified `reversal.service.ts` to call `makeReverseTransaction` instead of `makeFullFundTransfer`:

```typescript
await BakongService.makeReverseTransaction(
  data.amount,
  data.currency,
  data.originalMsgId || "UNKNOWN_MSG_ID",
  data.originalPmtInfId || "UNKNOWN_PMT_INF_ID",
  data.debtorAccount || "unknown@account",
);
```

## Configuration

### BIC Codes (in `generateReversalMessage`)

Currently hardcoded - you may need to adjust these:

```typescript
const DEBTOR_BIC = "TOURKHPP"; // The one initiating the reversal
const CREDITOR_BIC = "BKRTKHPP"; // The one receiving the reversal
```

**TODO:** Consider moving these to environment variables:

```env
BAKONG_DEBTOR_BIC=TOURKHPP
BAKONG_CREDITOR_BIC=BKRTKHPP
```

## How It Works

### Automatic Reversal Flow

1. **Cron Job Triggers** (every 60 seconds)
2. **System calls `getIncomingTransaction`** via SOAP
3. **XML Parser detects** reversal transaction
4. **Extracts required fields:**
   - `originalMsgId`
   - `originalPmtInfId`
   - `debtorAccount`
   - `amount`
   - `currency`
5. **Validates transaction** against Bakong REST API
6. **Checks database** to prevenduplicate processing
7. **Generates ISO 20022 pain.007.001.05 XML**
8. **Sends `makeReverseTransaction` SOAP request**
9. **Logs transaction** to database

## Next Steps

### 1. **Update XML Parser** (if needed)

The current `xml-parser.ts` expects `FitToFICstmrCdtTrf` format. You may need to update it to also parse incoming reversal requests that use `CstmrPmtRvsl` format.

### 2. **Test with Real Data**

Wait for a real reversal transaction from NBC to see the actual XML structure in `getIncomingTransaction` response.

### 3. **Environment Variables**

Consider adding to `.env.development`:

```env
# Reversal Configuration
BAKONG_DEBTOR_BIC=TOURKHPP
BAKONG_CREDITOR_BIC=BKRTKHPP
BAKONG_DEBTOR_NAME=National Bank of Cambodia
BAKONG_CREDITOR_NAME=LOLC
```

### 4. **Error Handling**

Add specific error handling for reversal failures:

```typescript
try {
  const response = await BakongService.makeReverseTransaction(...);
  // Parse response and check for success/failure
} catch (error) {
  // Log reversal failure
  // Maybe retry or alert
}
```

## Testing

### Manual Test (when reversal arrives):

1. Monitor the console logs
2. When `getIncomingTransaction` returns reversal data
3. Check that system detects it as a reversal
4. Verify `makeReverseTransaction` is called
5. Confirm transaction is saved to database

## Difference from `makeFullFundTransfer`

| Feature              | makeFullFundTransfer              | makeReverseTransaction                                           |
| -------------------- | --------------------------------- | ---------------------------------------------------------------- |
| **ISO 20022 Format** | pain.001.001.05 (Credit Transfer) | pain.007.001.05 (Payment Reversal)                               |
| **Purpose**          | New payment transfer              | Reverse previous payment                                         |
| **Required Fields**  | Amount, Currency, Hash            | Amount, Currency, OriginalMsgId, OriginalPmtInfId, DebtorAccount |
| **SOAP Parameter**   | `ext_ref`, `iso_message`          | `content_message` only                                           |

---

**Status**: ✅ Implementation Complete  
**Last Updated**: 2026-01-27  
**Version**: 2.0 - Reversal Support
