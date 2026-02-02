# 🔄 Complete Transaction Flow Analysis

## Files from Your Boss - Understanding the Flow

Your boss gave you **4 XML files** showing **2 different transaction scenarios**:

---

## 📊 **Overview: Two Different Scenarios**

### **Scenario A: Bakong Retail → Tourist (BKRT → TOUR)**

1. `getIncomingTransaction_BakongRetail.xml` - Check incoming to BKRTKHPPXXX
2. `makeReverseTransaction_BakongRetail.xml` - Send reversal from TOUR → BKRT

### **Scenario B: Tourist → Bakong Retail (TOUR → BKRT)**

1. `getIncomingTransaction_TouristSIT.xml` - Check incoming to TOURKHPPXXX
2. `makeFullFundTransfer_TouristSIT.xml` - Send payment from BKRT → TOUR

---

## 🎯 **Scenario A: Bakong Retail Flow (Your Current System)**

### **Step 1: Check for Incoming Transactions**

**File:** `getIncomingTransaction_BakongRetail.xml`

```xml
<web:getIncomingTransaction>
    <web:cm_user_name>soap1</web:cm_user_name>
    <web:cm_password>P@ssw0rd123</web:cm_password>
    <web:payee_participant_code>BKRTKHPPXXX</web:payee_participant_code>  ← Check BKRT account
    <web:size>200</web:size>  ← Get up to 200 transactions
</web:getIncomingTransaction>
```

**What this does:**

- Asks NBC: "Any new transactions for account **BKRTKHPPXXX**?"
- Uses credentials: `soap1` / `P@ssw0rd123`
- Checks up to 200 pending transactions

**Your System:** ✅ Already does this (but missing `payee_participant_code` & `size`!)

---

### **Step 2: NBC Sends Reversal Transaction**

**NBC Response:** When reversal is detected, it contains:

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
    <CstmrPmtRvsl>  ← ✅ REVERSAL DETECTED!
        <OrgnlMsgId>40cb600f850c47c5985d706aabc9d631</OrgnlMsgId>
        <OrgnlPmtInfId>TOURKHPPXXX/BKRTKHPPXXX/test4t</OrgnlPmtInfId>
        <RvslId>FT123456789</RvslId>
        <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
    </CstmrPmtRvsl>
</Document>
```

**Your System:** ✅ Detects this via `CstmrPmtRvsl` element

---

### **Step 3: Automatic Reversal Response**

**File:** `makeReverseTransaction_BakongRetail.xml`

```xml
<web:makeReverseTransaction>
    <web:cm_user_name>soap1</web:cm_user_name>
    <web:cm_password>P@ssw0rd123</web:cm_password>
    <web:content_message><![CDATA[
        <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
            <CstmrPmtRvsl>
                <GrpHdr>
                    <MsgId>CRTACLBKHPPXXX092154</MsgId>
                    <DbtrAgt><FinInstnId><BICFI>TOURKHPP</BICFI></FinInstnId></DbtrAgt>  ← FROM
                    <CdtrAgt><FinInstnId><BICFI>BKRTKHPP</BICFI></FinInstnId></CdtrAgt>  ← TO
                </GrpHdr>
                <OrgnlGrpInf>
                    <OrgnlMsgId>40cb600f850c47c5985d706aabc9d631</OrgnlMsgId>  ← Original hash
                </OrgnlGrpInf>
                <OrgnlPmtInfAndRvsl>
                    <OrgnlPmtInfId>TOURKHPPXXX/BKRTKHPPXXX/test4t</OrgnlPmtInfId>
                    <TxInf>
                        <RvslId>FT123456789</RvslId>
                        <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
                        <RvsdInstdAmt Ccy="KHR">800</RvsdInstdAmt>  ← Reversed amount
                    </TxInf>
                </OrgnlPmtInfAndRvsl>
            </CstmrPmtRvsl>
        </Document>
    ]]></web:content_message>
</web:makeReverseTransaction>
```

**Flow:**

```
Original Transaction: TOURKHPPXXX → BKRTKHPPXXX (800 KHR)
NBC Requests Reversal: Send money back!
Your System Response: BKRTKHPPXXX → TOURKHPPXXX (800 KHR)
```

**Your System:** ⚠️ Currently sends NBCOKHPP → NBHQKHPP (different BIC codes!)

---

## 🎯 **Scenario B: Tourist Flow (Alternative Example)**

### **Step 1: Check for Incoming Transactions**

**File:** `getIncomingTransaction_TouristSIT.xml`

```xml
<web:getIncomingTransaction>
    <web:cm_user_name>rothtana</web:cm_user_name>  ← Different user!
    <web:cm_password>P@ssw0rd</web:cm_password>
    <web:payee_participant_code>TOURKHPPXXX</web:payee_participant_code>  ← Check TOUR account
    <web:size>200</web:size>
</web:getIncomingTransaction>
```

**What this does:**

- Asks NBC: "Any new transactions for account **TOURKHPPXXX**?"
- Uses different credentials: `rothtana` / `P@ssw0rd`

---

### **Step 2: Send Full Fund Transfer**

**File:** `makeFullFundTransfer_TouristSIT.xml`

```xml
<web:makeFullFundTransfer>
    <web:cm_user_name>rothtana</web:cm_user_name>
    <web:cm_password>P@ssw0rd</web:cm_password>
    <web:iso_message><![CDATA[
        <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
            <CstmrCdtTrfInitn>  ← Regular Payment (NOT reversal)
                <GrpHdr>
                    <MsgId>TESTMSGID0001</MsgId>
                    <CtrlSum>8000</CtrlSum>
                </GrpHdr>
                <PmtInf>
                    <PmtInfId>TOURKHPPXXX/BKRTKHPPXXX/test4t</PmtInfId>
                    <DbtrAgt><FinInstnId><BICFI>BKRTKHPP</BICFI></FinInstnId></DbtrAgt>  ← FROM
                    <CdtTrfTxInf>
                        <Amt><InstdAmt Ccy="KHR">800</InstdAmt></Amt>
                        <CdtrAgt><FinInstnId><BICFI>TOURKHPP</BICFI></FinInstnId></CdtrAgt>  ← TO
                    </CdtTrfTxInf>
                </PmtInf>
            </CstmrCdtTrfInitn>
        </Document>
    ]]></web:iso_message>
    <web:ext_ref>test4t</web:ext_ref>
</web:makeFullFundTransfer>
```

**Flow:**

```
Regular Payment: BKRTKHPP → TOURKHPP (800 KHR)
```

---

## 🔍 **Key Differences Discovered**

### **1. Missing Parameters in Your Current System**

Your `getIncomingTransaction` is missing:

| Parameter                | Purpose                        | Your Boss's Example            | Your Current Code |
| ------------------------ | ------------------------------ | ------------------------------ | ----------------- |
| `payee_participant_code` | Specify which account to check | `BKRTKHPPXXX` or `TOURKHPPXXX` | ❌ **Missing!**   |
| `size`                   | Max number of transactions     | `200`                          | ❌ **Missing!**   |

**This is important!** NBC might require these parameters.

---

### **2. BIC Code Mismatch**

**Your Boss's Example (Bakong Retail):**

```
Reversal Flow: TOURKHPP → BKRTKHPP
```

**Your Current System:**

```
Reversal Flow: NBCOKHPP → NBHQKHPP
```

**Question for your boss:** Which BIC codes should you actually use?

- `TOURKHPP ↔ BKRTKHPP` (from example files)
- `NBCOKHPP → NBHQKHPP` (from boss's verbal requirement)

Likely **both** are valid but for **different accounts/scenarios**!

---

## 📋 **Complete Flow Diagram**

### **Current Flow (Based on Boss's Files)**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Monitor Incoming Transactions                      │
├─────────────────────────────────────────────────────────────┤
│ Your System (Every 60s):                                    │
│   → Call getIncomingTransaction                             │
│   → Username: soap1                                         │
│   → Password: P@ssw0rd123                                   │
│   → Payee Code: BKRTKHPPXXX  ← ⚠️ Need to add this!        │
│   → Size: 200  ← ⚠️ Need to add this!                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: NBC Responds with Transaction                       │
├─────────────────────────────────────────────────────────────┤
│ NBC SOAP Response:                                          │
│   IF Regular Payment:                                       │
│     → Contains <CstmrCdtTrfInitn>                          │
│     → Your System: Ignore (not a reversal)                 │
│                                                             │
│   IF Reversal:                                             │
│     → Contains <CstmrPmtRvsl>  ← ✅                        │
│     → Your System: DETECT IT!                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Extract Reversal Details                           │
├─────────────────────────────────────────────────────────────┤
│ Parse XML:                                                  │
│   → Original Message ID (Hash)                             │
│   → Original Payment Info ID                               │
│   → Debtor Account (bkrtkhppxxx@bkrt)                      │
│   → Amount (800 KHR)                                       │
│   → Currency (KHR)                                         │
│   → BIC Codes: TOURKHPP & BKRTKHPP                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Verify Transaction (REST API)                      │
├─────────────────────────────────────────────────────────────┤
│ Call Bakong Open API:                                      │
│   → Endpoint: /v1/check_transaction_by_hash                │
│   → Hash: 40cb600f850c47c5985d706aabc9d631                 │
│   → Response Code: 0 = Valid ✅                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Check Database for Duplicates                      │
├─────────────────────────────────────────────────────────────┤
│ Query: SELECT 1 FROM transaction_logs WHERE trx_hash = ?   │
│   IF EXISTS: Stop (already processed)                      │
│   IF NOT EXISTS: Continue to processing                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: AUTO-SEND REVERSAL TRANSACTION                     │
├─────────────────────────────────────────────────────────────┤
│ Your System Sends:                                          │
│   → Method: makeReverseTransaction                         │
│   → Username: soap1                                        │
│   → Password: P@ssw0rd123                                  │
│   → ISO Message: pain.007.001.05 XML                       │
│   → FROM: TOURKHPP (Debtor)                                │
│   → TO: BKRTKHPP (Creditor)                                │
│   → Amount: 800 KHR                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Save to Database                                   │
├─────────────────────────────────────────────────────────────┤
│ INSERT INTO transaction_logs:                              │
│   → trx_hash: 40cb600f850c47c5985d706aabc9d631            │
│   → amount: 800                                            │
│   → currency: KHR                                          │
│   → status: SUCCESS                                        │
│   → created_at: NOW()                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ✅ COMPLETE!
```

---

## ⚠️ **Issues Found in Your Current System**

### **Issue 1: Missing SOAP Parameters**

Your `getIncomingTransaction` should include:

```typescript
// CURRENT (Missing parameters):
async getIncomingTransactions(): Promise<string> {
    const soapBody = `
        <web:getIncomingTransaction>
            <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
            <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
        </web:getIncomingTransaction>`;
    return await sendSoapRequest(soapBody);
}

// SHOULD BE (Based on boss's files):
async getIncomingTransactions(): Promise<string> {
    const soapBody = `
        <web:getIncomingTransaction>
            <web:cm_user_name>${process.env.BAKONG_USERNAME}</web:cm_user_name>
            <web:cm_password>${process.env.BAKONG_PASSWORD}</web:cm_password>
            <web:payee_participant_code>BKRTKHPPXXX</web:payee_participant_code>
            <web:size>200</web:size>
        </web:getIncomingTransaction>`;
    return await sendSoapRequest(soapBody);
}
```

---

### **Issue 2: BIC Code Configuration**

**Two possible scenarios:**

**Scenario A: Bakong Retail Flow** (from boss's XML files)

```
FROM: TOURKHPP
TO: BKRTKHPP
```

**Scenario B: NBC Internal Flow** (from boss's verbal requirement)

```
FROM: NBCOKHPP (Operational)
TO: NBHQKHPP (Headquarters)
```

**Question:** Ask your boss which one applies to YOUR system!

---

## 🎯 **What Each File Shows**

| File                                      | Purpose              | Who Uses It   | Direction   |
| ----------------------------------------- | -------------------- | ------------- | ----------- |
| `getIncomingTransaction_BakongRetail.xml` | Check BKRT account   | Bakong Retail | BKRT ← NBC  |
| `getIncomingTransaction_TouristSIT.xml`   | Check TOUR account   | Tourist       | TOUR ← NBC  |
| `makeFullFundTransfer_TouristSIT.xml`     | Send regular payment | Tourist       | BKRT → TOUR |
| `makeReverseTransaction_BakongRetail.xml` | Send reversal        | Bakong Retail | TOUR → BKRT |

---

## ✅ **Action Items**

### **1. Update Your SOAP Request**

Add missing parameters:

- `payee_participant_code`
- `size`

### **2. Clarify BIC Codes with Boss**

Ask:

> "Should the reversal flow be:
>
> - **TOURKHPP → BKRTKHPP** (like the XML examples), or
> - **NBCOKHPP → NBHQKHPP** (like you mentioned)?
>   Or are these for different scenarios?"

### **3. Add Environment Variables**

```env
BAKONG_PAYEE_CODE=BKRTKHPPXXX  # or TOURKHPPXXX or NBCOKHPPXXX
BAKONG_TRANSACTION_SIZE=200
```

---

## 🎉 **Summary**

Your boss gave you **real production examples**! They show:

1. ✅ **How to check incoming transactions** (with `payee_participant_code` & `size`)
2. ✅ **What a reversal looks like** (`CstmrPmtRvsl` element)
3. ✅ **How to send reversal response** (exact XML format)
4. ✅ **Two different account scenarios** (BKRT/TOUR & NBCO/NBHQ)

**Your system is 90% correct!** Just need to:

- Add missing SOAP parameters
- Clarify which BIC codes to use
- Test with real examples!

---

**Next Steps:**

1. Ask boss about BIC codes
2. Update SOAP request parameters
3. Test with real NBC endpoint

Want me to update your code with the missing parameters? 🚀
