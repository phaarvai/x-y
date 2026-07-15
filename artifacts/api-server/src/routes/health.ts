import { Router } from "express";
import { pool } from "@workspace/db";
import { config } from "../config/env";
import { getMetricsSnapshot } from "../lib/observability";

const router = Router();

/** Legacy health — preserve existing contract */
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

/** Liveness — process is up */
router.get("/livez", (_req, res) => {
  res.json({ status: "alive", ts: new Date().toISOString() });
});

/** Readiness — DB connectivity */
router.get("/readyz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready", checks: { database: "ok" } });
  } catch (err) {
    res.status(503).json({
      status: "not_ready",
      checks: { database: "fail" },
      error: err instanceof Error ? err.message : "db error",
    });
  }
});

export default router;

/** Versioned health + system under /api/v1 */
export const v1SystemRouter = Router();

v1SystemRouter.get("/health", async (_req, res) => {
  let dbOk = false;
  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const status = dbOk ? "ok" : "degraded";
  res.status(dbOk ? 200 : 503).json({
    status,
    version: "v1",
    env: config.appEnv,
    checks: {
      database: dbOk ? "ok" : "fail",
      storage: config.storageProvider,
    },
    ts: new Date().toISOString(),
  });
});

v1SystemRouter.get("/live", (_req, res) => {
  res.json({ status: "alive", version: "v1" });
});

v1SystemRouter.get("/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready", version: "v1", checks: { database: "ok" } });
  } catch {
    res.status(503).json({ status: "not_ready", version: "v1", checks: { database: "fail" } });
  }
});

v1SystemRouter.get("/system", (_req, res) => {
  res.json({
    name: "X!Y Explorer Factory API",
    version: "1.0.0",
    apiVersion: "v1",
    env: config.appEnv,
    node: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    features: config.featureFlags,
    storageProvider: config.storageProvider,
    metrics: config.metricsEnabled ? getMetricsSnapshot() : undefined,
  });
});
