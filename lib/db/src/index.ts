import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const max = Number(process.env.DB_POOL_MAX ?? "10");
const idleTimeoutMillis = Number(process.env.DB_POOL_IDLE_MS ?? "30000");
const connectionTimeoutMillis = Number(process.env.DB_POOL_CONNECT_MS ?? "10000");

/** Connection-pooled Postgres client (environment-tunable). */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isFinite(max) && max > 0 ? max : 10,
  idleTimeoutMillis: Number.isFinite(idleTimeoutMillis) ? idleTimeoutMillis : 30000,
  connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis)
    ? connectionTimeoutMillis
    : 10000,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
