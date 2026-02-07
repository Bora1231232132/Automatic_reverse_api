import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.development
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

/**
 * Authentication Service for NBC Bakong Report API
 * Handles JWT token management with automatic caching and refresh
 */

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

const AUTH_URL = process.env.BAKONG_AUTH_URL || "http://10.20.6.228/api/authenticate";

export const AuthService = {
  /**
   * Get a valid JWT token. Returns cached token if available,
   * otherwise performs login.
   */
  async getToken(): Promise<string> {
    // Check if cached token is still valid (with 1 minute buffer)
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
      return cachedToken;
    }

    // Token expired or not available, login
    console.log("[AUTH] Obtaining new JWT token...");
    cachedToken = await this.login();
    return cachedToken;
  },

  /**
   * Login to NBC authentication API and retrieve JWT token
   */
  async login(): Promise<string> {
    try {
      const response = await axios.post(
        AUTH_URL,
        {
          username: process.env.BAKONG_USERNAME,
          password: process.env.BAKONG_PASSWORD,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // The API wraps the token in a data object: response.data.data.id_token
      const token = response.data.data?.id_token;

      if (!token) {
        console.error("   Full response:", JSON.stringify(response.data, null, 2));
        throw new Error("No id_token in authentication response");
      }

      // Parse JWT to get expiry time (if available)
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );
        if (payload.exp) {
          tokenExpiry = payload.exp * 1000; // Convert to milliseconds
          console.log(
            `[AUTH] JWT token obtained (expires: ${new Date(tokenExpiry).toISOString()})`
          );
        } else {
          console.log("[AUTH] JWT token obtained (no expiry in token)");
        }
      } catch (parseErr) {
        console.log("[AUTH] JWT token obtained (could not parse expiry)");
      }

      return token;
    } catch (error: any) {
      console.error("[ERROR] Authentication failed:", error.message);
      if (error.response) {
        console.error("   Status:", error.response.status);
        console.error("   Response:", error.response.data);
      }
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  },

  /**
   * Invalidate cached token (call this on 401 Unauthorized)
   */
  invalidateToken(): void {
    console.log("[AUTH] Token invalidated, will refresh on next request");
    cachedToken = null;
    tokenExpiry = null;
  },

  /**
   * Check if we have a cached token (for testing/debugging)
   */
  hasToken(): boolean {
    return cachedToken !== null;
  },
};
