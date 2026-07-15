/**
 * EPIC 17 — Migration runner for hand-written SQL migrations.
 *
 * Commands:
 *   pnpm --filter @workspace/db migrate
 *   pnpm --filter @workspace/db migrate:status
 *   pnpm --filter @workspace/db migrate:rollback
 *   pnpm --filter @workspace/db seed
 *
 * Migrations live in lib/db/migrations/*.sql (up) and optional *.down.sql (rollback).
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set to run migrations");
  }
  return url;
}

async function ensureMetaTables(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      version varchar(128),
      name varchar(255),
      applied_at timestamp NOT NULL DEFAULT now(),
      checksum varchar(64),
      execution_ms integer
    );
  `);
  // Upgrade legacy format (filename-only) used by earlier local DBs
  await client.query(`
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS version varchar(128);
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS name varchar(255);
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum varchar(64);
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS execution_ms integer;
  `);
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schema_migrations' AND column_name = 'filename'
      ) THEN
        UPDATE schema_migrations
        SET version = COALESCE(version, split_part(filename, '_', 1)),
            name = COALESCE(name, replace(filename, '.sql', ''))
        WHERE version IS NULL OR name IS NULL;
      END IF;
    END $$;
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_version_uidx
    ON schema_migrations (version)
    WHERE version IS NOT NULL;
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations_lock (
      id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      locked boolean NOT NULL DEFAULT false,
      locked_at timestamp,
      locked_by varchar(255)
    );
  `);
  await client.query(`
    INSERT INTO schema_migrations_lock (id, locked)
    VALUES (1, false)
    ON CONFLICT (id) DO NOTHING;
  `);
}

async function acquireLock(client: pg.Client) {
  const lockedBy = `pid:${process.pid}@${process.env.HOSTNAME ?? "local"}`;
  const res = await client.query(
    `UPDATE schema_migrations_lock
     SET locked = true, locked_at = now(), locked_by = $1
     WHERE id = 1 AND locked = false
     RETURNING id`,
    [lockedBy],
  );
  if (res.rowCount === 0) {
    throw new Error("Could not acquire migration lock — another migration may be running");
  }
}

async function releaseLock(client: pg.Client) {
  await client.query(
    `UPDATE schema_migrations_lock SET locked = false, locked_at = null, locked_by = null WHERE id = 1`,
  );
}

type MigrationFile = {
  version: string;
  name: string;
  upPath: string;
  downPath: string | null;
};

async function listMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  const ups = entries
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql") && !f.includes(".repeatable."))
    .sort();

  return ups.map((file) => {
    const version = file.replace(/\.sql$/, "").split("_")[0] ?? file;
    const name = file.replace(/\.sql$/, "");
    const downCandidate = file.replace(/\.sql$/, ".down.sql");
    return {
      version,
      name,
      upPath: path.join(MIGRATIONS_DIR, file),
      downPath: entries.includes(downCandidate) ? path.join(MIGRATIONS_DIR, downCandidate) : null,
    };
  });
}

async function appliedVersions(client: pg.Client): Promise<Set<string>> {
  const res = await client.query<{ version: string }>(`SELECT version FROM schema_migrations`);
  return new Set(res.rows.map((r) => r.version));
}

function checksum(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function migrateUp() {
  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    await ensureMetaTables(client);
    await acquireLock(client);
    try {
      const files = await listMigrationFiles();
      const applied = await appliedVersions(client);

      for (const file of files) {
        if (applied.has(file.version)) continue;
        const sql = await fs.readFile(file.upPath, "utf8");
        const started = Date.now();
        console.log(`→ Applying ${file.name}…`);
        await client.query("BEGIN");
        try {
          await client.query(sql);
          // Legacy DBs may require `filename` NOT NULL; prefer dual write when present.
          const hasFilename = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'schema_migrations' AND column_name = 'filename'
          `);
          if (hasFilename.rowCount) {
            await client.query(
              `INSERT INTO schema_migrations (filename, version, name, checksum, execution_ms)
               SELECT $1, $2, $3, $4, $5
               WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $2)`,
              [`${file.name}.sql`, file.version, file.name, checksum(sql), Date.now() - started],
            );
          } else {
            await client.query(
              `INSERT INTO schema_migrations (version, name, checksum, execution_ms)
               SELECT $1, $2, $3, $4
               WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)`,
              [file.version, file.name, checksum(sql), Date.now() - started],
            );
          }
          await client.query("COMMIT");
          console.log(`✓ Applied ${file.name} (${Date.now() - started}ms)`);
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      }
      console.log("Migrations complete.");
    } finally {
      await releaseLock(client);
    }
  } finally {
    await client.end();
  }
}

export async function migrateStatus() {
  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    await ensureMetaTables(client);
    const files = await listMigrationFiles();
    const applied = await appliedVersions(client);
    for (const file of files) {
      const mark = applied.has(file.version) ? "applied" : "pending";
      console.log(`${mark.padEnd(8)} ${file.version}  ${file.name}`);
    }
  } finally {
    await client.end();
  }
}

export async function migrateRollback(steps = 1) {
  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    await ensureMetaTables(client);
    await acquireLock(client);
    try {
      const res = await client.query<{ version: string; name: string }>(
        `SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT $1`,
        [steps],
      );
      const files = await listMigrationFiles();
      const byVersion = new Map(files.map((f) => [f.version, f]));

      for (const row of res.rows) {
        const file = byVersion.get(row.version);
        if (!file?.downPath) {
          throw new Error(`No down migration for ${row.name}. Aborting rollback.`);
        }
        const sql = await fs.readFile(file.downPath, "utf8");
        console.log(`← Rolling back ${row.name}…`);
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(`DELETE FROM schema_migrations WHERE version = $1`, [row.version]);
          await client.query("COMMIT");
          console.log(`✓ Rolled back ${row.name}`);
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      }
    } finally {
      await releaseLock(client);
    }
  } finally {
    await client.end();
  }
}

/** Repeatable migrations: *.repeatable.sql — re-run every time (idempotent SQL required) */
export async function migrateRepeatable() {
  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    const entries = await fs.readdir(MIGRATIONS_DIR);
    const files = entries.filter((f) => f.includes(".repeatable.") && f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`↻ Repeatable ${file}…`);
      await client.query(sql);
      console.log(`✓ ${file}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const cmd = process.argv[2] ?? "up";
  if (cmd === "up" || cmd === "migrate") {
    await migrateUp();
    await migrateRepeatable();
  } else if (cmd === "status") {
    await migrateStatus();
  } else if (cmd === "rollback" || cmd === "down") {
    const steps = Number(process.argv[3] ?? "1");
    await migrateRollback(Number.isFinite(steps) ? steps : 1);
  } else if (cmd === "repeatable") {
    await migrateRepeatable();
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
