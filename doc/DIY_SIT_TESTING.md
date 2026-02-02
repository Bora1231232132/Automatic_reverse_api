# 🎯 DIY SIT Testing - Create Your Own Reversal Scenario

## Test Reversal Using Your Own SIT Account

**Great news!** Since you have your own SIT account, you can create and test reversals yourself!

---

## 🚀 **Quick Method: 2-Step Process**

### **Step 1: Create a Transaction**

Send money from your SIT account → NBCOKHPPXXX

### **Step 2: Request Reversal**

Reverse that transaction (which triggers your automation!)

---

## 📱 **Method 1: Using Bakong Mobile App (SIT Version)**

### **Part A: Send Test Payment**

1. **Open Bakong SIT App**
   - Login with your SIT test account credentials

2. **Send Money**
   - **To:** NBCOKHPPXXX (your monitoring account)
   - **Amount:** 800 KHR (or any test amount)
   - **Note:** "Test transaction for reversal automation"
   - **Submit** the transaction

3. **Save Transaction Details**
   - Copy the **transaction hash/ID**
   - Note the **timestamp**
   - Keep the confirmation screen

---

### **Part B: Request Reversal**

**Option 1: Through Bakong App (if available)**

- Look for "Request Refund" or "Cancel Transaction"
- Select the transaction you just sent
- Submit reversal request

**Option 2: Through NBC Portal (if you have access)**

- Login to NBC SIT admin portal
- Find your transaction
- Click "Reverse Transaction"
- Confirm reversal

**Option 3: Contact NBC Support**

- Send them:
  > "Hi, I need to reverse a transaction for testing:
  >
  > - Transaction Hash: [your_hash]
  > - From: [your account]
  > - To: NBCOKHPPXXX
  > - Amount: 800 KHR
  > - Reason: Testing automation system"

---

### **Part C: Monitor Your Automation**

Once reversal is requested, your system will detect it within **60 seconds**!

```bash
--- ⏰ Cron Triggered: Checking for Reversals ---
🔄 Step 1: Asking Bank for new transactions...
🔄 Detected: Payment Reversal (pain.007.001.05)   ← ✅ YOUR REVERSAL!
📄 Step 2: Parsed Data. Hash: [your_hash] | Reversal? true
🔎 Step 3.5: Verifying hash with Bakong Open API...
✅ Verified! Transaction exists and is valid.
🟢 Step 3: New Transaction found! Proceeding to Refund...
🚀 Step 4: Reversal Request Sent to Bakong.
    FROM: NBCOKHPP
    TO: NBHQKHPP
    AMOUNT: 800 KHR
💾 Step 5: Saved to Database. Cycle Complete.
```

---

## 🌐 **Method 2: Using SOAP API Directly (Advanced)**

If you have SOAP credentials for your SIT account, you can create transactions programmatically.

### **Step 1: Send Test Transaction**

Use Postman or your test script:

```xml
POST http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Body>
      <web:makeFullFundTransfer>
         <web:cm_user_name>YOUR_SIT_USERNAME</web:cm_user_name>
         <web:cm_password>YOUR_SIT_PASSWORD</web:cm_password>
         <web:iso_message><![CDATA[
            <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
               <CstmrCdtTrfInitn>
                  <GrpHdr>
                     <MsgId>TEST001</MsgId>
                     <CreDtTm>2026-01-28T10:54:00+07:00</CreDtTm>
                     <NbOfTxs>1</NbOfTxs>
                  </GrpHdr>
                  <PmtInf>
                     <PmtInfId>YOUR_ACCOUNT/NBCOKHPPXXX/test001</PmtInfId>
                     <DbtrAgt>
                        <FinInstnId><BICFI>YOUR_BIC</BICFI></FinInstnId>
                     </DbtrAgt>
                     <CdtTrfTxInf>
                        <Amt><InstdAmt Ccy="KHR">800</InstdAmt></Amt>
                        <CdtrAgt>
                           <FinInstnId><BICFI>NBCOKHPP</BICFI></FinInstnId>
                        </CdtrAgt>
                     </CdtTrfTxInf>
                  </PmtInf>
               </CstmrCdtTrfInitn>
            </Document>
         ]]></web:iso_message>
         <web:ext_ref>test001</web:ext_ref>
      </web:makeFullFundTransfer>
   </soapenv:Body>
</soapenv:Envelope>
```

### **Step 2: Get Transaction Hash from Response**

NBC will return the transaction hash. Save it!

### **Step 3: Request Reversal**

Ask NBC or use their portal to reverse that specific transaction hash.

---

## 💻 **Method 3: Using Bakong Web Portal (If Available)**

### **Step 1: Login to SIT Portal**

- Go to NBC SIT web portal
- Login with your test account

### **Step 2: Create Transaction**

- Navigate to "Send Money" or "Transactions"
- **Recipient:** NBCOKHPPXXX
- **Amount:** 800 KHR
- **Submit**

### **Step 3: Reverse Transaction**

- Go to "Transaction History"
- Find the transaction you just created
- Click "Request Reversal" or "Reverse"
- Confirm

### **Step 4: Monitor Your System**

Your automation will detect and process it!

---

## 📋 **Complete Testing Workflow**

```
YOU (SIT Account)
    ↓
[Create Transaction]
    FROM: Your SIT Account
    TO: NBCOKHPPXXX
    AMOUNT: 800 KHR
    ↓
[Transaction Complete]
    ↓
[Request Reversal]
    (Via app, portal, or NBC support)
    ↓
[NBC Creates Reversal Entry]
    ↓
[Your Automation Detects It]
    Every 60 seconds checking...
    ↓
[Reversal Detected!]
    🔄 Detected: Payment Reversal
    ↓
[Auto-Processing]
    ✅ Verify with REST API
    🚀 Send: NBCOKHPP → NBHQKHPP
    💾 Save to database
    ↓
[Test Complete!] ✅
```

---

## 🎯 **What You Need**

### **Required:**

- [x] Your SIT account credentials
- [x] Access to Bakong app/portal/API
- [x] Your automation system running
- [x] 800 KHR (or any amount) in SIT account

### **Optional:**

- [ ] Postman (for API testing)
- [ ] NBC SIT admin portal access
- [ ] SOAP credentials for your account

---

## ✅ **Step-by-Step Checklist**

### **Before Testing:**

- [ ] Your automation system is running (`npm run dev`)
- [ ] Console shows: `⏰ Cron Scheduler: ACTIVATED`
- [ ] Database is connected
- [ ] You have SIT account access

### **During Testing:**

**Phase 1: Create Transaction**

- [ ] Login to Bakong SIT
- [ ] Send 800 KHR to NBCOKHPPXXX
- [ ] Transaction successful
- [ ] Save transaction hash/ID

**Phase 2: Request Reversal**

- [ ] Request reversal of that transaction
- [ ] NBC confirms reversal created
- [ ] Reversal should appear in queue

**Phase 3: Monitor Automation**

- [ ] Keep automation running
- [ ] Wait maximum 60 seconds
- [ ] Check console for detection
- [ ] Verify "Payment Reversal" message

**Phase 4: Verify Results**

- [ ] Check database: new transaction logged
- [ ] Check NBC: reversal processed (NBCOKHPP → NBHQKHPP)
- [ ] Wait 60s more: duplicate prevention works

---

## 🚨 **Troubleshooting**

### **Issue 1: Can't find "Reverse Transaction" option**

**Solution:**

- Not all SIT apps have self-service reversal
- Contact NBC support with transaction hash
- Ask them to reverse it for testing

---

### **Issue 2: Transaction sent but no reversal detected**

**Checklist:**

- [ ] Did you reverse the transaction or just cancel?
- [ ] Is reversal actually created in NBC system?
- [ ] Is your automation still running?
- [ ] Are you monitoring the right account (NBCOKHPPXXX)?

---

### **Issue 3: System still shows "No reversal found"**

**Possible causes:**

1. Reversal not created yet (NBC processing delay)
2. Reversal sent to wrong account
3. Timing - wait for next cron cycle

**Solution:**

- Wait 2-3 cycles (2-3 minutes)
- Check with NBC if reversal was created
- Verify transaction was to NBCOKHPPXXX

---

## 📊 **Expected Timeline**

```
T+0:00  You: Send 800 KHR to NBCOKHPPXXX via SIT app
T+0:05  NBC: Transaction confirmed
T+0:10  You: Request reversal of that transaction
T+0:15  NBC: Reversal created in system
T+1:00  Your System: Next cron cycle
T+1:05  Your System: 🔄 Detected: Payment Reversal! ✅
T+1:10  Your System: ✅ Verified and processed
T+1:15  Your System: 💾 Saved to database
T+2:00  Your System: Next cycle
T+2:05  Your System: ⛔ Already processed (duplicate prevention)
```

**Total time:** About 2-3 minutes! 🚀

---

## 🎉 **Advantages of DIY Testing**

### ✅ **No waiting for NBC**

- You control the timing
- Test whenever you want
- No email requests needed

### ✅ **Repeatable**

- Can test multiple times
- Try different amounts
- Test edge cases

### ✅ **Complete control**

- You know exactly when reversal is created
- Can time your monitoring
- Full visibility of the flow

### ✅ **Faster feedback**

- 2-3 minutes vs hours/days
- Immediate results
- Quick iteration

---

## 📝 **Quick Start Guide**

### **Right Now - 3 Steps:**

1. **Send Transaction** (Your SIT account → NBCOKHPPXXX, 800 KHR)
2. **Request Reversal** (Via app, portal, or NBC support)
3. **Watch Console** (Within 60s, should see detection!)

---

## 💡 **Pro Tip**

Keep a **test transaction log**:

```
Test #1 - 2026-01-28 10:55
- Sent: 800 KHR
- From: [your SIT account]
- To: NBCOKHPPXXX
- Transaction Hash: [hash]
- Reversal Requested: 10:56
- Detected by System: 10:57 ✅
- Database ID: 1
- Status: SUCCESS ✅
```

This helps you track multiple tests!

---

## 🎯 **Your Next Action**

**Right now, do this:**

1. **Login to your Bakong SIT account** (app or web)
2. **Send 800 KHR to NBCOKHPPXXX**
3. **Request reversal** of that transaction
4. **Watch your console** within 60 seconds!

**That's it!** 🚀

---

## ❓ **Need Help?**

If you get stuck:

1. **Check your automation is running** (`npm run dev`)
2. **Verify transaction went to NBCOKHPPXXX**
3. **Confirm reversal was actually created**
4. **Wait full 60 seconds** for next cron cycle
5. **Check database** to see if it was saved

---

**Ready to test?** Just send that transaction and request the reversal! Your system will do the rest! ✨
