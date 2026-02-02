import { parseBakongXML } from "../utils/xml-parser";

// --- TEMPORARY TEST: Fake Bakong XML ---
const sampleXML = `
<Document>
  <FitToFICstmrCdtTrf>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>test4t</EndToEndId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="KHR">800</InstdAmt>
      </Amt>
      <RmtInf>
        <Ustrd>REVERSING - test4t trx_hash:97c24d0f88e613a27903338757a0c1e526bd710d1f6f89c46a1a97b72a333964</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FitToFICstmrCdtTrf>
</Document>
`;

console.log("🧪 Testing Parser...");
const result = parseBakongXML(sampleXML);

console.log("✅ Is Reversal?", result.isReversal); // Should be true
console.log("✅ Hash Found:", result.trxHash); // Should be "97c24d..."
console.log("✅ Amount:", result.amount); // Should be 800
console.log("✅ Currency:", result.currency); // Should be "KHR"
console.log("✅ EndToEndId:", result.endToEndId); // Should be "test4t"
console.log("\n📦 Full Result:", result);
