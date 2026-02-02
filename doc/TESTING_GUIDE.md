# 🧪 Testing Guide - Bakong SIT Environment

## How to Create Test Transactions

This guide explains how to create transactions in the Bakong SIT environment to test your automation system.

---

## 📱 Method 1: Using Bakong Mobile App (KHQR)

### Prerequisites

1. Download **Bakong App** (SIT version) from NBC
2. Create a test account in the SIT environment
3. Get test credentials from NBC

### Steps to Create a Transaction

1. **Generate a KHQR Code**
   - Use the Bakong SIT portal or API to generate a KHQR payment code
   - The code should be linked to your institution account (`@bkrt` or similar)

2. **Scan and Pay**
   - Open Bakong app
   - Scan the KHQR code
   - Enter amount (e.g., 800 KHR)
   - Submit payment

3. **Monitor Your System**
   - Your cron job should detect the incoming transaction within 60 seconds
   - Check console logs for transaction processing

---

## 🔧 Method 2: Using Bakong REST API (Programmatic)

### Step 1: Create a Payment Request

Create a test script to make a payment:

```typescript
// test-create-payment.ts
import axios from "axios";

const BAKONG_API_URL = "https://sit-api-bakong.nbc.gov.kh/v1";
const API_KEY = "your_api_key";
const API_SECRET = "your_api_secret";

async function createTestPayment() {
  try {
    const response = await axios.post(
      `${BAKONG_API_URL}/payment/create`,
      {
        amount: "800",
        currency: "KHR",
        account_id: "bkrtkhppxxx@bkrt", // Your receiving account
        description: "Test payment for reversal automation",
      },
      {
        headers: {
          "Api-Key": API_KEY,
          "Api-Secret": API_SECRET,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Payment Created:", response.data);
    console.log("Transaction Hash:", response.data.hash);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to create payment:", error);
  }
}

createTestPayment();
```

**Run the script:**

```bash
npx ts-node test-create-payment.ts
```

---

## 🔄 Method 3: Trigger a Reversal (What You Really Want to Test)

### Option A: Request Reversal via NBC

Contact NBC support to:

1. Create a test transaction
2. Request them to send a reversal (`pain.007.001.05`)
3. Your system should automatically detect and process it

### Option B: Use NBC Testing Portal

If NBC provides a testing portal:

1. Log in to NBC SIT portal
2. Navigate to "Transactions" or "Testing Tools"
3. Create a transaction
4. Click "Initiate Reversal" or similar option
5. NBC will send the reversal via SOAP `getIncomingTransaction`

### Option C: Mock a Reversal Locally

For immediate testing without NBC:

**1. Update your `.env.development`:**

```env
# Switch to mock mode
BAKONG_SOAP_URL=http://localhost:3000/mock-bakong
```

**2. Update the mock controller** to return a reversal:

```typescript
// src/controllers/mock.controller.ts
export const MockBakongController = {
  handleSoapRequest: (req: Request, res: Response) => {
    const mockReversalXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
        <CstmrPmtRvsl>
          <GrpHdr>
            <MsgId>TEST_${Date.now()}</MsgId>
            <CreDtTm>${new Date().toISOString()}</CreDtTm>
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
                  <Id><Othr><Id>bkrtkhppxxx@bkrt</Id></Othr></Id>
                </DbtrAcct>
              </OrgnlTxRef>
            </TxInf>
          </OrgnlPmtInfAndRvsl>
        </CstmrPmtRvsl>
      </Document>
    `;

    res.set("Content-Type", "text/xml");
    res.send(`
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <getIncomingTransactionResponse>
            <return><![CDATA[${mockReversalXml}]]></return>
          </getIncomingTransactionResponse>
        </soap:Body>
      </soap:Envelope>
    `);
  },
};
```

**3. Restart your server:**

```bash
npm run dev
```

Your system will now process the mock reversal every 60 seconds!

---

## 📊 Method 4: Using SOAP Directly (Advanced)

### Create a SOAP Client Test Script

```typescript
// test-soap-manual.ts
import axios from "axios";

const SOAP_URL = "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface";
const USERNAME = "soap1";
const PASSWORD = "P@ssw0rd123";

async function testSOAPConnection() {
  const soapRequest = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                      xmlns:web="http://webservice.nbc.org.kh/">
       <soapenv:Header/>
       <soapenv:Body>
          <web:getIncomingTransaction>
             <web:cm_user_name>${USERNAME}</web:cm_user_name>
             <web:cm_password>${PASSWORD}</web:cm_password>
          </web:getIncomingTransaction>
       </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await axios.post(SOAP_URL, soapRequest, {
      headers: {
        "Content-Type": "text/xml",
        SOAPAction: "getIncomingTransaction",
      },
    });

    console.log("✅ SOAP Response:");
    console.log(response.data);
  } catch (error: any) {
    console.error("❌ SOAP Error:", error.message);
  }
}

testSOAPConnection();
```

**Run:**

```bash
npx ts-node test-soap-manual.ts
```

---

## 🎯 Complete Testing Workflow

### Test Scenario 1: Regular Transaction Detection

1. Create a transaction (Method 1 or 2)
2. Wait for cron job (max 60 seconds)
3. Check logs for: `🔄 Step 1: Asking Bank for new transactions...`
4. Verify transaction is detected but NOT processed (not a reversal)

### Test Scenario 2: Reversal Detection & Processing

1. Create a reversal (Method 3A, 3B, or 3C)
2. Wait for cron job
3. Check logs for:
   ```
   🔄 Detected: Payment Reversal (pain.007.001.05)
   🔎 Verifying hash with Bakong Open API...
   ✅ Verified! Transaction exists and is valid.
   🟢 New Transaction found! Proceeding to Refund...
   🚀 Reversal Request Sent to Bakong.
   💾 Saved to Database. Cycle Complete.
   ```
4. Verify database entry:
   ```sql
   SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 1;
   ```

### Test Scenario 3: Duplicate Prevention

1. Don't restart the server
2. Wait for next cron tick (60s)
3. Should see: `⛔ STOP! Transaction XXX was already processed.`
4. Confirms duplicate prevention works!

---

## 🔍 Monitoring & Debugging

### Watch Live Logs

```bash
npm run dev
```

### Check Database

```sql
-- Check all processed transactions
SELECT * FROM transaction_logs ORDER BY created_at DESC;

-- Check if specific hash exists
SELECT * FROM transaction_logs WHERE trx_hash = 'YOUR_HASH_HERE';

-- Count processed transactions
SELECT COUNT(*) as total FROM transaction_logs;
```

### Enable Debug Mode

Add to `.env.development`:

```env
DEBUG=true
```

---

## 📞 Getting Help from NBC

### What to Ask NBC Support For:

1. **"How do I create test transactions in SIT?"**
   - Request access to SIT testing portal
   - Ask for test account credentials
   - Request documentation for creating transactions

2. **"How do I trigger a reversal in SIT?"**
   - Ask them to manually initiate a reversal
   - Request ability to self-service reversals in testing portal

3. **"Can you send me a sample reversal transaction?"**
   - Request they trigger a reversal to your account
   - This will test your automation end-to-end

4. **"What's the expected turnaround time for reversals?"**
   - Understand their processing timeline
   - Adjust your cron schedule if needed

---

## ✅ Verification Checklist

After testing, verify:

- [ ] System detects incoming transactions
- [ ] Reversal transactions are identified correctly
- [ ] REST API hash verification works
- [ ] Duplicate detection prevents re-processing
- [ ] Reversal SOAP request is sent successfully
- [ ] Transaction is saved to database
- [ ] No errors in console logs
- [ ] Database contains correct transaction data

---

## 🎉 Success Criteria

Your system is working correctly when:

1. ✅ It detects a new reversal within 60 seconds
2. ✅ Verifies the transaction hash with Bakong REST API
3. ✅ Sends the reversal request via SOAP
4. ✅ Saves to database
5. ✅ Ignores the same transaction on next cron tick

---

## 🚨 Common Issues

### Issue 1: No Transactions Detected

- **Check:** SOAP endpoint is correct (`10.20.6.223`)
- **Check:** Credentials are valid (`soap1` / `P@ssw0rd123`)
- **Solution:** Test with mock mode first

### Issue 2: Transaction Not Verified

- **Check:** REST API credentials are correct
- **Check:** Transaction hash format is valid
- **Solution:** Check `BAKONG_API_KEY` and `BAKONG_API_SECRET`

### Issue 3: Duplicate Processing

- **Check:** Database connection is working
- **Check:** `transaction_logs` table exists
- **Solution:** Check PostgreSQL connection and table schema

---

**Need more help?** Check the conversation history for past fixes or create a new test scenario! 🚀
