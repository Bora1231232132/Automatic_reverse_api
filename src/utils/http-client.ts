import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * REST client for Bakong Open API (e.g. check_transaction_by_hash).
 * Base URL and ApiKey come from BAKONG_API_URL and BAKONG_API_KEY.
 */
const bakongClient = axios.create({
  baseURL: process.env.BAKONG_API_URL || "",
  headers: {
    "Content-Type": "application/json",
    Authorization: `ApiKey ${process.env.BAKONG_API_KEY}`,
  },
  timeout: 10000,
});

/** POST to Bakong REST API and return response data; throws on error. */
export async function postRequest<T>(endpoint: string, body: any): Promise<T> {
  try {
    const response = await bakongClient.post(endpoint, body);
    return response.data;
  } catch (error: any) {
    console.error(
      `❌ API Error [${endpoint}]:`,
      error?.response?.data || error.message,
    );
    throw error;
  }
}

export default bakongClient;
