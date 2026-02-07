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

/**
 * POST to Bakong REST API with retry logic for transient errors (5xx).
 * Retries on 5xx errors (502, 503, 504) with exponential backoff.
 *
 * Environment variables:
 * - BAKONG_API_MAX_RETRIES: Maximum retry attempts (default: 3)
 * - BAKONG_API_RETRY_DELAY_MS: Base delay in milliseconds (default: 1000)
 */
export async function postRequest<T>(endpoint: string, body: any): Promise<T> {
  const maxRetries = parseInt(process.env.BAKONG_API_MAX_RETRIES || "3");
  const baseDelay = parseInt(process.env.BAKONG_API_RETRY_DELAY_MS || "1000");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await bakongClient.post(endpoint, body);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isRetryable = status >= 500 && status < 600;

      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(
          `⏳ Retry ${attempt}/${maxRetries} for ${endpoint} after ${delay}ms (status: ${status})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error(
        `[ERROR] API Error [${endpoint}]:`,
        error?.response?.data || error.message
      );
      throw error;
    }
  }
  throw new Error(`Max retries exceeded for ${endpoint}`);
}

export default bakongClient;
