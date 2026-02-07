import express from "express";
import dotenv from "dotenv";
import { testDbconnection } from "./config/db";
import { startCronJobs } from "./jobs/reversal.cron";
import {
  triggerReversalCheck,
  forceProcessReversal,
} from "./controllers/reversal.controller";

/** Load environment variables from .env.development */
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

/**
 * Start the application: start server immediately, connect DB in background, start cron.
 */
const startServer = async () => {
  // Start server immediately without waiting for DB
  app.listen(PORT, () => {
    console.log(`\n[SERVER] System Online!`);
    console.log(`[SERVER] Server listening on port ${PORT}`);

    if (process.env.BAKONG_SOAP_URL?.includes("mock-bakong")) {
      console.log(`[SERVER] Mock Mode: Using local mock server for SOAP`);
    } else {
      console.log(
        `[SERVER] Production Mode: SOAP endpoint ${process.env.BAKONG_SOAP_URL}`,
      );
    }

    console.log(`[SERVER] Bot started - Processing transactions immediately...`);
    console.log(`   Health: GET http://localhost:${PORT}/health`);
  });

  // Connect DB in background (non-blocking)
  testDbconnection().catch((err) => {
    console.error(
      "[WARN] DB connection failed (will retry on health check):",
      err.message,
    );
  });

  // Start cron jobs immediately
  startCronJobs();

  /** Manual trigger endpoints for debugging */
  app.post("/api/trigger-reversal-check", triggerReversalCheck);
  app.post("/api/force-process-reversal", forceProcessReversal);

  /** GET /health — used by monitoring/load balancers to check if DB is reachable */
  app.get("/health", async (_req, res) => {
    try {
      await testDbconnection();
      res.status(200).json({ status: "ok", db: "connected" });
    } catch {
      res.status(503).json({ status: "error", db: "disconnected" });
    }
  });
};

startServer();
