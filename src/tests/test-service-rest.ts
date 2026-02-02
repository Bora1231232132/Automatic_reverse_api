import { BakongService } from "../services/bakong.service";

async function runTest() {
  console.log("🧪 Testing REST Service: Check Transaction Status");

  const specificHash =
    "fcdfbfd68a0c3753bedda7c4c5c786e8c917761e2135b1cec6262a26166337bc";

  try {
    console.log(`🔎 Checking Hash: ${specificHash}`);
    const result = await BakongService.checkTransactionByHash(specificHash);

    console.log("✅ API Response Received:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

runTest();
