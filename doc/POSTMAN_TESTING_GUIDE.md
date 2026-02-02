# 📬 Postman Testing Guide - Bakong Automation

## Complete guide for testing your Bakong integration using Postman

---

## 🎯 Quick Start

You can use Postman to test:

1. ✅ **SOAP API** - getIncomingTransaction, makeReverseTransaction
2. ✅ **REST API** - check_transaction_by_hash
3. ✅ **Mock Server** - Local testing endpoint

---

## 📦 Setup Postman Collection

### Step 1: Create New Collection

1. Open Postman
2. Click **"New Collection"**
3. Name it: **"Bakong Automation Testing"**
4. Add description: "SOAP and REST API testing for Bakong reversal system"

### Step 2: Create Environment Variables

Create a new environment called **"Bakong SIT"**:

| Variable        | Initial Value                                                      | Current Value |
| --------------- | ------------------------------------------------------------------ | ------------- |
| `soap_url`      | `http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface`      | Same          |
| `soap_username` | `soap1`                                                            | Same          |
| `soap_password` | `P@ssw0rd123`                                                      | Same          |
| `rest_api_url`  | `https://sit-api-bakong.nbc.gov.kh/v1`                             | Same          |
| `api_key`       | `5b88c3cf9408262b64cd08f000a1b1e485cb15fc4d94e9a6e805cee04ffd6990` | Same          |
| `api_secret`    | `c5a54bedadff3513ad8c159c9f1fd70b9b1d4bbf72f5fd9369b41cd081cf45b8` | Same          |
| `mock_url`      | `http://localhost:3000/mock-bakong`                                | Same          |

---

## 🧪 Test 1: SOAP - Get Incoming Transactions

### Request Configuration

**Method:** `POST`  
**URL:** `{{soap_url}}`  
**Headers:**

```
Content-Type: text/xml; charset=utf-8
SOAPAction: "getIncomingTransaction"
```

**Body (raw XML):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:getIncomingTransaction>
         <web:cm_user_name>{{soap_username}}</web:cm_user_name>
         <web:cm_password>{{soap_password}}</web:cm_password>
      </web:getIncomingTransaction>
   </soapenv:Body>
</soapenv:Envelope>
```

### Expected Response

**Success (200 OK):**

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <ns2:getIncomingTransactionResponse xmlns:ns2="http://webservice.nbc.org.kh/">
         <ns2:return><![CDATA[
            <?xml version="1.0" encoding="UTF-8"?>
            <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
               <CstmrPmtRvsl>
                  <!-- Reversal transaction details -->
               </CstmrPmtRvsl>
            </Document>
         ]]></ns2:return>
      </ns2:getIncomingTransactionResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

**No Transactions (200 OK):**

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <ns2:getIncomingTransactionResponse xmlns:ns2="http://webservice.nbc.org.kh/">
         <ns2:return></ns2:return>
      </ns2:getIncomingTransactionResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

### Postman Tests (Add to "Tests" tab)

```javascript
// Test that response is 200
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Test that response is XML
pm.test("Response is XML", function () {
  pm.response.to.have.header("Content-Type");
  pm.expect(pm.response.headers.get("Content-Type")).to.include("xml");
});

// Test that SOAP envelope exists
pm.test("SOAP Envelope exists", function () {
  pm.expect(pm.response.text()).to.include("Envelope");
});

// Check if transaction exists in response
pm.test("Check for transaction data", function () {
  const responseText = pm.response.text();
  if (responseText.includes("CstmrPmtRvsl")) {
    console.log("✅ Reversal transaction detected!");
  } else if (responseText.includes("FitToFICstmrCdtTrf")) {
    console.log("✅ Regular transaction detected!");
  } else {
    console.log("⚠️ No transactions pending");
  }
});
```

---

## 🔄 Test 2: SOAP - Make Reverse Transaction

### Request Configuration

**Method:** `POST`  
**URL:** `{{soap_url}}`  
**Headers:**

```
Content-Type: text/xml; charset=utf-8
SOAPAction: "makeReverseTransaction"
```

**Body (raw XML):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:makeReverseTransaction>
         <web:cm_user_name>{{soap_username}}</web:cm_user_name>
         <web:cm_password>{{soap_password}}</web:cm_password>
         <web:content_message><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.007.001.05">
  <CstmrPmtRvsl>
    <GrpHdr>
      <MsgId>CRTTOURKHPP1737984553000</MsgId>
      <CreDtTm>2026-01-28T08:35:13.000Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <DbtrAgt><FinInstnId><BICFI>TOURKHPP</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BKRTKHPP</BICFI></FinInstnId></CdtrAgt>
    </GrpHdr>
    <OrgnlGrpInf>
      <OrgnlMsgId>40cb600f850c47c5985d706aabc9d631</OrgnlMsgId>
      <OrgnlMsgNmId>pain.001.001.05</OrgnlMsgNmId>
      <OrgnlCreDtTm>2026-01-28T08:30:13.000Z</OrgnlCreDtTm>
    </OrgnlGrpInf>
    <OrgnlPmtInfAndRvsl>
      <OrgnlPmtInfId>TOURKHPPXXX/BKRTKHPPXXX/test4t</OrgnlPmtInfId>
      <TxInf>
        <RvslId>FT1737984553000</RvslId>
        <OrgnlInstdAmt Ccy="KHR">800</OrgnlInstdAmt>
        <RvsdInstdAmt Ccy="KHR">800</RvsdInstdAmt>
        <RvslRsnInf>
          <Orgtr><Nm>NBCO</Nm></Orgtr>
          <Rsn><Cd>GDDS</Cd></Rsn>
        </RvslRsnInf>
        <OrgnlTxRef>
          <ReqdExctnDt>2026-01-28Z</ReqdExctnDt>
          <Dbtr><Nm>NBCO</Nm></Dbtr>
          <DbtrAcct>
            <Id><Othr><Id>bkrtkhppxxx@bkrt</Id></Othr></Id>
          </DbtrAcct>
          <Cdtr><Nm>LOLC</Nm></Cdtr>
        </OrgnlTxRef>
      </TxInf>
    </OrgnlPmtInfAndRvsl>
  </CstmrPmtRvsl>
</Document>]]></web:content_message>
      </web:makeReverseTransaction>
   </soapenv:Body>
</soapenv:Envelope>
```

### Expected Response

**Success:**

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <ns2:makeReverseTransactionResponse xmlns:ns2="http://webservice.nbc.org.kh/">
         <ns2:return>
            <!-- Success response with transaction status -->
         </ns2:return>
      </ns2:makeReverseTransactionResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

---

## 🌐 Test 3: REST API - Check Transaction by Hash

### Request Configuration

**Method:** `POST`  
**URL:** `{{rest_api_url}}/check_transaction_by_hash`  
**Headers:**

```
Api-Key: {{api_key}}
Api-Secret: {{api_secret}}
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "hash": "40cb600f850c47c5985d706aabc9d631"
}
```

### Expected Response

**Success (Transaction Found):**

```json
{
  "responseCode": 0,
  "responseMessage": "Success",
  "data": {
    "hash": "40cb600f850c47c5985d706aabc9d631",
    "status": "COMPLETED",
    "amount": "800",
    "currency": "KHR",
    "timestamp": "2026-01-28T08:30:13.000Z"
  }
}
```

**Not Found:**

```json
{
  "responseCode": 1,
  "responseMessage": "Transaction not found",
  "data": null
}
```

### Postman Tests

```javascript
// Test status code
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Test response is JSON
pm.test("Response is JSON", function () {
  pm.response.to.be.json;
});

// Test response structure
pm.test("Response has responseCode", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("responseCode");
});

// Test transaction validity
pm.test("Transaction is valid", function () {
  var jsonData = pm.response.json();
  if (jsonData.responseCode === 0) {
    console.log("✅ Transaction is valid and exists");
    pm.expect(jsonData.data).to.have.property("hash");
  } else {
    console.log("❌ Transaction not found or invalid");
  }
});
```

---

## 🎭 Test 4: Mock Server (Local Testing)

### Start Your Server First

```bash
# In terminal
npm run dev
```

### Request Configuration

**Method:** `POST`  
**URL:** `{{mock_url}}`  
**Headers:**

```
Content-Type: text/xml; charset=utf-8
```

**Body (any SOAP request):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <web:getIncomingTransaction>
         <web:cm_user_name>test</web:cm_user_name>
         <web:cm_password>test</web:cm_password>
      </web:getIncomingTransaction>
   </soapenv:Body>
</soapenv:Envelope>
```

### Expected Response

The mock server will return a fake reversal transaction for testing.

---

## 📋 Postman Collection (Import This)

Save this as `Bakong-Automation.postman_collection.json`:

```json
{
  "info": {
    "name": "Bakong Automation Testing",
    "description": "Complete test suite for Bakong SOAP and REST APIs",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "SOAP - Get Incoming Transactions",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "text/xml; charset=utf-8"
          },
          {
            "key": "SOAPAction",
            "value": "getIncomingTransaction"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:web=\"http://webservice.nbc.org.kh/\">\n   <soapenv:Header/>\n   <soapenv:Body>\n      <web:getIncomingTransaction>\n         <web:cm_user_name>{{soap_username}}</web:cm_user_name>\n         <web:cm_password>{{soap_password}}</web:cm_password>\n      </web:getIncomingTransaction>\n   </soapenv:Body>\n</soapenv:Envelope>"
        },
        "url": {
          "raw": "{{soap_url}}",
          "host": ["{{soap_url}}"]
        }
      }
    },
    {
      "name": "REST - Check Transaction Hash",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Api-Key",
            "value": "{{api_key}}"
          },
          {
            "key": "Api-Secret",
            "value": "{{api_secret}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"hash\": \"40cb600f850c47c5985d706aabc9d631\"\n}"
        },
        "url": {
          "raw": "{{rest_api_url}}/check_transaction_by_hash",
          "host": ["{{rest_api_url}}"],
          "path": ["check_transaction_by_hash"]
        }
      }
    },
    {
      "name": "Mock - Test Local Server",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "text/xml"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\">\n   <soapenv:Body>\n      <getIncomingTransaction/>\n   </soapenv:Body>\n</soapenv:Envelope>"
        },
        "url": {
          "raw": "{{mock_url}}",
          "host": ["{{mock_url}}"]
        }
      }
    }
  ]
}
```

**To Import:**

1. Copy the JSON above
2. In Postman: **Import** → **Raw text** → Paste → **Import**

---

## 🎯 Step-by-Step Testing Workflow

### Scenario 1: Test Mock Server

1. ✅ Start your server: `npm run dev`
2. ✅ Open Postman
3. ✅ Send request to **Mock - Test Local Server**
4. ✅ Should get XML response with fake reversal
5. ✅ Check your server logs - should show processing

### Scenario 2: Test Real SOAP API

1. ✅ Set environment to **"Bakong SIT"**
2. ✅ Send **SOAP - Get Incoming Transactions**
3. ✅ Check response for pending transactions
4. ✅ If reversal found, copy the `OrgnlMsgId` (transaction hash)

### Scenario 3: Verify Transaction Hash

1. ✅ Copy transaction hash from Step 2
2. ✅ Update **REST - Check Transaction Hash** body
3. ✅ Send request
4. ✅ Should get `responseCode: 0` if valid

### Scenario 4: End-to-End Test

1. ✅ Ask NBC to create a test reversal
2. ✅ Use Postman to check `getIncomingTransaction`
3. ✅ Verify you see the reversal transaction
4. ✅ Let your automation process it (via cron)
5. ✅ Check database to confirm it was saved

---

## 🔍 Debugging Tips

### Enable Postman Console

**View** → **Show Postman Console** (or `Ctrl+Alt+C`)

This shows:

- Full request/response headers
- Request body sent
- Response time
- Error details

### Common Issues & Solutions

**Issue 1: 405 Method Not Allowed**

- ✅ Check SOAPAction header is correct
- ✅ Verify endpoint URL is complete

**Issue 2: 401 Unauthorized**

- ✅ Check credentials in environment variables
- ✅ Verify Api-Key and Api-Secret for REST API

**Issue 3: Connection Timeout**

- ✅ Check VPN connection if NBC requires it
- ✅ Verify firewall allows outbound connections
- ✅ Test with mock server first

**Issue 4: Invalid XML**

- ✅ Check for typos in namespace
- ✅ Ensure CDATA section is properly closed
- ✅ Validate XML in online validator

---

## 📊 Response Codes Reference

### SOAP Responses

- `200 OK` - Request successful
- `401 Unauthorized` - Invalid credentials
- `405 Method Not Allowed` - Wrong endpoint or SOAPAction
- `500 Internal Server Error` - Server-side error

### REST API Response Codes

- `responseCode: 0` - Success
- `responseCode: 1` - Not found / Invalid
- `responseCode: -1` - System error

---

## 🎉 Quick Win Test

**Test your mock server right now:**

1. Open terminal:

   ```bash
   npm run dev
   ```

2. In Postman:
   - Method: `POST`
   - URL: `http://localhost:3000/mock-bakong`
   - Body: Any XML
   - Send!

3. You should get a fake reversal transaction back! ✅

---

## 📞 Next Steps

1. ✅ Import the Postman collection
2. ✅ Set up environment variables
3. ✅ Test mock server first
4. ✅ Test real SOAP endpoint
5. ✅ Request NBC to send a test reversal
6. ✅ Monitor your automation processing it

---

**Happy Testing!** 🚀

If you encounter any issues, check the Postman Console for detailed error messages.
