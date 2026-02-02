import axios from "axios";

/**
 * Test script to verify Bakong API connectivity
 * Tests the check_transaction_by_hash endpoint
 */

const API_KEY =
  "5b88c3cf9408262b64cd08f000a1b1e485cb15fc4d94e9a6e805cee04ffd6990";
const SECRET_KEY =
  "c5a54bedadff3513ad8c159c9f1fd70b9b1d4bbf72f5fd9369b41cd081cf45b8";
const BASE_URL = "https://sit-api-bakong.nbc.gov.kh";

async function testCheckTransaction() {
  console.log("🧪 Testing Bakong API: check_transaction_by_hash\n");

  try {
    const response = await axios.post(
      `${BASE_URL}/v1/check_transaction_by_hash`,
      {
        hash: "fcdfbfd68a0c3753bedda7c4c5c786e8c917761e2135b1cec6262a26166337bc",
      },
      {
        headers: {
          Authorization: `ApiKey ${API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Success! Response:");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("\n📊 Status Code:", response.status);
  } catch (error: any) {
    console.error("❌ API Test Failed:");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
  }
}

// Run the test
testCheckTransaction();
