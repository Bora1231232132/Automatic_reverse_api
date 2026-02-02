# 🏦 Bakong SOAP Integration Guide

## Overview

This guide explains how the Bakong automation system has been configured to work with the real SOAP API format based on the provided request/response examples.

## ✅ What Was Updated

### 1. **SOAP Request Format** (`bakong.service.ts`)

Both `getIncomingTransactions` and `makeFullFundTransfer` now use the correct namespace and tag structure:

- **Namespace**: `xmlns:web="http://webservice.nbc.org.kh/"`
- **Tag Format**: `<web:cm_user_name>` and `<web:cm_password>` instead of `<arg0>` and `<arg1>`

### 2. **ISO 20022 XML Generation** (`generateIsoMessage`)

Updated to match the exact format from `SPG-makeFullFundTransfer-Req.txt`:

- ✅ **Date Format**: `2026-01-19T18:00:00.000+07:00` (with timezone)
- ✅ **ext_ref Structure**: `NBCOKHPPXXX/NBHQKHPPXXX/RFOBS{timestamp}`
- ✅ **Dynamic IDs**: Message ID, Payment Info ID, and Reference ID are all generated dynamically
- ✅ **Proper Hierarchy**: All XML tags match the ISO 20022 pain.001.001.05 standard

### 3. **Environment Configuration**

Separated REST and SOAP configurations:

```env
# REST API (for transaction verification)
BAKONG_API_URL=https://sit-api-bakong.nbc.gov.kh/v1

# SOAP API (for transaction retrieval and refunds)
BAKONG_SOAP_URL=http://localhost:3000/mock-bakong  # Currently in mock mode
```

## 🎭 Mock Mode Setup

Currently configured to use the local mock server for testing:

### Running the Mock Server

```bash
npm run dev
```

The mock server will:

- ✅ Listen at `http://localhost:3000/mock-bakong`
- ✅ Respond to SOAP requests with fake reversal transactions
- ✅ Allow you to test the full flow without hitting the real API

## 🏦 Production Mode Setup

### Step 1: Get the Correct SOAP Endpoint

You need to find the correct SOAP URL from NBC documentation. Common possibilities:

- `https://sit-api-bakong.nbc.gov.kh/BakongService`
- `https://sit-api-bakong.nbc.gov.kh/soap`
- `https://soap.sit-api-bakong.nbc.gov.kh/`
- Or another specific path

### Step 2: Update `.env.development`

Once you have the correct URL, update your configuration:

```env
# Bakong API Configuration (SOAP)
# 🏦 PRODUCTION MODE
BAKONG_SOAP_URL=https://sit-api-bakong.nbc.gov.kh/[CORRECT_PATH]

# Legacy credentials (required for SOAP)
BAKONG_USERNAME=spgapp
BAKONG_PASSWORD=PAsssww222025
```

### Step 3: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## 📡 SOAP Request Examples

### getIncomingTransactions

**Request:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:getIncomingTransaction>
         <web:cm_user_name>spgapp</web:cm_user_name>
         <web:cm_password>PAsssww222025</web:cm_password>
      </web:getIncomingTransaction>
   </soapenv:Body>
</soapenv:Envelope>
```

### makeFullFundTransfer

**Request:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.nbc.org.kh/">
   <soapenv:Header/>
   <soapenv:Body>
      <web:makeFullFundTransfer>
         <web:cm_user_name>spgapp</web:cm_user_name>
         <web:cm_password>PAsssww222025</web:cm_password>
         <web:ext_ref>NBCOKHPPXXX/NBHQKHPPXXX/RFOBS1737982800000</web:ext_ref>
         <web:iso_message><![CDATA[
            <?xml version="1.0" encoding="UTF-8"?>
            <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.05">
               <!-- ISO 20022 XML content -->
            </Document>
         ]]></web:iso_message>
      </web:makeFullFundTransfer>
   </soapenv:Body>
</soapenv:Envelope>
```

**Expected Response:**

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <ns2:makeFullFundTransferResponse xmlns:ns2="http://webservice.nbc.org.kh/">
         <ns2:return>&lt;?xml version="1.0"?&gt;
            &lt;Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.06"&gt;
               &lt;CstmrPmtStsRpt&gt;
                  &lt;TxInfAndSts&gt;
                     &lt;TxSts&gt;ACSP&lt;/TxSts&gt;
                     &lt;OrgnlTxRef&gt;
                        &lt;RmtInf&gt;
                           &lt;Ustrd&gt;598f81fc40e9508ce134fcc52f56e648...&lt;/Ustrd&gt;
                        &lt;/RmtInf&gt;
                     &lt;/OrgnlTxRef&gt;
                  &lt;/TxInfAndSts&gt;
               &lt;/CstmrPmtStsRpt&gt;
            &lt;/Document&gt;
         </ns2:return>
      </ns2:makeFullFundTransferResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

## 🔍 Response Parsing

The response contains the transaction hash in the `<Ustrd>` field. You may want to parse this and save it for verification purposes.

## 🚨 Known Issues & Next Steps

### Current Status: 405 Error

The 405 error occurs because:

1. The SOAP endpoint URL is incorrect (currently pointing to root `/`)
2. Need the correct service path from NBC

### To Do:

- [ ] Get correct SOAP endpoint URL from NBC
- [ ] Test with real API endpoint
- [ ] Parse and log the response transaction hash
- [ ] Add error handling for different response statuses (ACSP, RJCT, etc.)

## 📞 Support

If you encounter issues:

1. **Check Logs**: Look for detailed error messages in the console
2. **Verify Credentials**: Ensure `BAKONG_USERNAME` and `BAKONG_PASSWORD` are correct
3. **Check URL**: Confirm `BAKONG_SOAP_URL` points to the correct endpoint
4. **Network**: Ensure your server can reach the NBC API

---

**Last Updated**: 2026-01-27  
**Version**: 1.0  
**Status**: Mock Mode Active
