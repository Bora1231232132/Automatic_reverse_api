import pg from "pg";
import dotenv from "dotenv";
import path from "path";

/** Load DB config from .env.development (used by pool and testDbconnection) */
// Only load if not already loaded (dotenv.config() is idempotent but we avoid redundant calls)
if (!process.env.DB_HOST) {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.development"),
  });
}

// Only log DB config if in debug mode or first load
if (process.env.DEBUG_DB === "true") {
  console.log("[DB] Loading DB configuration from environment...");
  console.log("DB_HOST:", process.env.DB_HOST);
  console.log("DB_PORT:", process.env.DB_PORT);
  console.log("DB_USER:", process.env.DB_USER);
  console.log(
    "DB_PASSWORD:",
    process.env.DB_PASSWORD ? "***set***" : "[ERROR] NOT SET",
  );
  console.log("DB_NAME:", process.env.DB_NAME);
}

/**
 * PostgreSQL connection pool. Reuse this for all DB queries.
 * max: 20 = up to 20 connections at once; idle ones close after 30s.
 */
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1000, // Reduced from 2000ms to 1000ms for faster failure detection
});

/**
 * Verify DB is reachable. If database does not exist (code 3D000), create it then reconnect.
 * Used at startup and by GET /health.
 */
export const testDbconnection = async () => {
  try {
    const client = await pool.connect();
    // Only log on first successful connection
    if (!(global as any).__dbConnected) {
      console.log("[DB] Database connection successful");
      (global as any).__dbConnected = true;
    }
    client.release();
  } catch (err: any) {
    if (err.code === "3D000") {
      console.log("[DB] Database does not exist. Attempting to create it...");

      const setupPool = new pg.Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: "postgres",
      });

      try {
        const setupClient = await setupPool.connect();
        await setupClient.query(`CREATE DATABASE ${process.env.DB_NAME};`);
        console.log(
          `[DB] Database '${process.env.DB_NAME}' created successfully!`,
        );
        setupClient.release();
        await setupPool.end();

        const client = await pool.connect();
        console.log("[DB] Database connection successful");
        client.release();
      } catch (createErr) {
        console.error("[ERROR] Failed to create database:");
        console.error(createErr);
        process.exit(1);
      }
    } else {
      console.error(
        "[ERROR] Connection Failed. Check your .env file or if Postgres is running.",
      );
      console.error(err);
      process.exit(1);
    }
  }
};

export default pool;
