import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

/** Connection pool — configurable for NFR scalability (default 10 in server contexts). */
const maxConnections = Math.max(
  1,
  Math.min(50, Number(process.env.DB_POOL_MAX ?? (process.env.NODE_ENV === "production" ? 10 : 5)) || 5),
);

const client = postgres(connectionString, {
  max: maxConnections,
  idle_timeout: Number(process.env.DB_IDLE_TIMEOUT ?? 20),
  connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 10),
  prepare: true,
});

export const db = drizzle(client, { schema });
