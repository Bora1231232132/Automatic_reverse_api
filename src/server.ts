import express from "express";
import dotenv from "dotenv";
import { testDbconnection } from "./config/db";
import { startCronJobs } from "./jobs/reversal.cron";
import { MockBakongController } from "./controllers/mock.controller";

/** Load environment variables from .env files */
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Start the application: connect DB, start cron, expose health route, then listen.
 */
const startServer = async () => {
  await testDbconnection();

  startCronJobs();

  /** GET /health — used by monitoring/load balancers to check if DB is reachable */
  app.get("/health", async (_req, res) => {
    try {
      await testDbconnection();
      res.status(200).json({ status: "ok", db: "connected" });
    } catch {
      res.status(503).json({ status: "error", db: "disconnected" });
    }
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 System Online!`);
    console.log(`📡 Server listening on port ${PORT}`);

    if (process.env.BAKONG_SOAP_URL?.includes("mock-bakong")) {
      console.log(`🎭 Mock Mode: Using local mock server for SOAP`);
    } else {
      console.log(
        `🏦 Production Mode: SOAP endpoint ${process.env.BAKONG_SOAP_URL}`,
      );
    }

    console.log(`⏳ Waiting for next Cron tick...`);
    console.log(`   Health: GET http://localhost:${PORT}/health`);
  });
};

startServer();
