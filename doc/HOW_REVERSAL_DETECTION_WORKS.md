# 🔍 How the System Detects Reversal Transactions

## The Secret: XML Document Structure

Your system uses **ISO 20022 standards** to detect reversals. It's all about the **root element** in the XML!

---

## 🎯 Two Types of Transactions

### 1. ❌ **Regular Payment (NOT a Reversal)**

**ISO 20022 Standard:** `pain.001.001.05` - Customer Credit Transfer

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
    <CstmrCdtTrfInitn>   ← ⚠️ This means "Regular Payment"
        <GrpHdr>
            <MsgId>1234567890</MsgId>
            <CreDtTm>2026-01-28T10:00:00Z</CreDtTm>
        </GrpHdr>
        <PmtInf>
            <!-- Payment details -->
        </PmtInf>
    </CstmrCdtTrfInitn>
</Document>
```

**Parser Result:** `isReversal = false` ❌

---

### 2. ✅ **Reversal Transaction (THIS IS WHAT YOUR BOSS WANTS)**

**ISO 20022 Standard:** `pain.007.001.05` - Customer Payment Reversal

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
    <CstmrPmtRvsl>   ← ✅ This means "REVERSAL!"
        <GrpHdr>
            <MsgId>40cb600f850c47c5985d706aabc9d631</MsgId>
            <CreDtTm>2026-01-28T10:00:00Z</CreDtTm>
        </GrpHdr>
        <OrgnlGrpInf>
            <OrgnlMsgId>original_transaction_hash</OrgnlMsgId>
        </OrgnlGrpInf>
        <OrgnlPmtInfAndRvsl>
            <OrgnlPmtInfId>NBCOKHPPXXX/NBHQKHPPXXX/test4t</OrgnlPmtInfId>
            <TxInf>
                <RvslId>FT123456789</RvslId>
                <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
                <!-- Reversal details -->
            </TxInf>
        </OrgnlPmtInfAndRvsl>
    </CstmrPmtRvsl>
</Document>
```

**Parser Result:** `isReversal = true` ✅

---

## 🧠 Detection Logic (Step-by-Step)

### **What the Parser Does (src/utils/xml-parser.ts)**

```typescript
// Step 1: Parse XML to JSON
const jsonObj = parser.parse(cleanXml);

// Step 2: THE KEY CHECK - Look for CstmrPmtRvsl element
const reversalData = jsonObj?.Document?.CstmrPmtRvsl;

// Step 3: If it exists → IT'S A REVERSAL!
if (reversalData) {
    console.log("🔄 Detected: Payment Reversal (pain.007.001.05)");
    return { isReversal: true, ... };
}
```

---

## 🔑 The Key Difference (Visual)

### Regular Payment Structure:

```
Document
  └── CstmrCdtTrfInitn    ← "Customer Credit Transfer Initiation"
       └── PmtInf          (Payment Info)
```

### Reversal Transaction Structure:

```
Document
  └── CstmrPmtRvsl         ← "Customer Payment Reversal"
       ├── OrgnlGrpInf      (Original Group Info)
       └── OrgnlPmtInfAndRvsl  (Original Payment Info and Reversal)
```

---

## 📋 Real Example from Your System

### What NBC Sends (Reversal Transaction):

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <ns2:getIncomingTransactionResponse xmlns:ns2="http://webservice.nbc.org.kh/">
         <ns2:return><![CDATA[
            <?xml version="1.0" encoding="UTF-8"?>
            <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
                <CstmrPmtRvsl>   ← ✅ SYSTEM DETECTS THIS!
                    <GrpHdr>
                        <MsgId>40cb600f850c47c5985d706aabc9d631</MsgId>
                        <CreDtTm>2026-01-28T08:43:13.000Z</CreDtTm>
                        <NbOfTxs>1</NbOfTxs>
                    </GrpHdr>
                    <OrgnlGrpInf>
                        <OrgnlMsgId>40cb600f850c47c5985d706aabc9d631</OrgnlMsgId>
                        <OrgnlMsgNmId>pain.001.001.05</OrgnlMsgNmId>
                    </OrgnlGrpInf>
                    <OrgnlPmtInfAndRvsl>
                        <OrgnlPmtInfId>TOURKHPPXXX/BKRTKHPPXXX/test4t</OrgnlPmtInfId>
                        <TxInf>
                            <RvslId>FT123456789</RvslId>
                            <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
                            <OrgnlTxRef>
                                <DbtrAcct>
                                    <Id>
                                        <Othr>
                                            <Id>bkrtkhppxxx@bkrt</Id>
                                        </Othr>
                                    </Id>
                                </DbtrAcct>
                            </OrgnlTxRef>
                        </TxInf>
                    </OrgnlPmtInfAndRvsl>
                </CstmrPmtRvsl>
            </Document>
         ]]></ns2:return>
      </ns2:getIncomingTransactionResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

### What Your Parser Does:

```
1. Extract XML from SOAP envelope
2. Parse to JSON:
   {
     "Document": {
       "CstmrPmtRvsl": {  ← ✅ FOUND IT!
         "GrpHdr": {...},
         "OrgnlGrpInf": {...},
         "OrgnlPmtInfAndRvsl": {...}
       }
     }
   }
3. Check: Does "CstmrPmtRvsl" exist?
   → YES! It's a reversal!
4. Set isReversal = true
5. Extract reversal details
6. Return to main service
```

---

## 🎯 Console Output When Reversal Detected

```bash
📋 Parsed JSON: {
  "Document": {
    "CstmrPmtRvsl": {
      "GrpHdr": {
        "MsgId": "40cb600f850c47c5985d706aabc9d631",
        ...
      }
    }
  }
}
🔄 Detected: Payment Reversal (pain.007.001.05)   ← ✅ THIS LINE!
📄 Step 2: Parsed Data. Hash: 40cb600f850c47c5985d706aabc9d631 | Reversal? true
```

---

## 🔧 The Code in Action

### Location: `src/utils/xml-parser.ts` (Line 40-45)

```typescript
// This is THE KEY CHECK
const reversalData = jsonObj?.Document?.CstmrPmtRvsl;

if (reversalData) {
    // THIS ONLY RUNS FOR REVERSALS!
    console.log("🔄 Detected: Payment Reversal (pain.007.001.05)");

    // Extract reversal-specific fields
    const originalMsgId = reversalData?.OrgnlGrpInf?.OrgnlMsgId;
    const originalPmtInfId = reversalData?.OrgnlPmtInfAndRvsl?.OrgnlPmtInfId;
    const debtorAccount = reversalData?.OrgnlPmtInfAndRvsl?.TxInf?.OrgnlTxRef?.DbtrAcct?.Id?.Othr?.Id;

    return {
        isReversal: true,  ← ✅ This triggers the automation!
        trxHash: originalMsgId,
        amount: ...,
        currency: ...,
        originalMsgId,
        originalPmtInfId,
        debtorAccount
    };
}
```

---

## 📊 Comparison Table

| Feature                | Regular Payment            | Reversal Transaction              |
| ---------------------- | -------------------------- | --------------------------------- |
| **ISO 20022 Standard** | pain.001.001.05            | pain.007.001.05                   |
| **Root Element**       | `<CstmrCdtTrfInitn>`       | `<CstmrPmtRvsl>`                  |
| **Meaning**            | New payment                | Reverse previous payment          |
| **Detection**          | `CstmrCdtTrfInitn` element | `CstmrPmtRvsl` element            |
| **isReversal Flag**    | `false`                    | `true`                            |
| **System Action**      | Ignore (not a reversal)    | **Auto-send NBCOKHPP → NBHQKHPP** |
| **Has Original Hash?** | No                         | Yes (`OrgnlMsgId`)                |

---

## 🎯 Why This Works

### ISO 20022 is an International Standard

- **Banks worldwide** use these message formats
- **pain.007.001.05** is **officially** the "Payment Reversal" message
- **NBC follows this standard** when sending reversals
- Your system **reads the standard format** automatically

### NBC Cannot "Trick" the System

- NBC must use `pain.007.001.05` format for reversals (ISO standard)
- The XML namespace itself identifies it: `urn:iso:std:iso:20022:tech:xsd:pain.007.001.05`
- The root element `<CstmrPmtRvsl>` is mandatory in this format
- Your parser checks for this specific element

---

## 🧪 How to Test Detection

### Method 1: Check the Logs

When your system processes a reversal, you'll see:

```bash
🔄 Detected: Payment Reversal (pain.007.001.05)   ← THIS CONFIRMS IT!
```

### Method 2: Use Mock Server

Your mock server returns a fake reversal with `<CstmrPmtRvsl>` element.

Start server:

```bash
npm run dev
```

Check logs - should see "Detected: Payment Reversal"

### Method 3: Postman Test

Send request to `getIncomingTransaction` and examine the XML response:

- If it contains `<CstmrPmtRvsl>` → Reversal ✅
- If it contains `<CstmrCdtTrfInitn>` → Regular payment ❌

---

## 💡 Key Takeaway

**Your system detects reversals by checking for the `<CstmrPmtRvsl>` XML element:**

```typescript
const reversalData = jsonObj?.Document?.CstmrPmtRvsl;

if (reversalData) {
  // IT'S A REVERSAL!
  // Automatically send NBCOKHPPXXX → NBHQKHPPXXX
}
```

**Simple, reliable, and follows international banking standards!** ✅

---

## 🎉 Summary

1. **NBC sends** transaction via `getIncomingTransaction` SOAP API
2. **XML contains** either:
   - `<CstmrCdtTrfInitn>` = Regular payment → Ignore
   - `<CstmrPmtRvsl>` = **REVERSAL** → **Auto-process!**
3. **Your parser** checks for `CstmrPmtRvsl` element
4. **If found** → `isReversal = true`
5. **System triggers** automatic NBCOKHPPXXX → NBHQKHPPXXX transaction

**No guessing, no manual checking - it's in the XML standard!** 🎯
