import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { uploadedFilesTable } from "./storage";

/** NFR — password reset, email verify, OTP (hashed secrets only) */
export const authTokensTable = pgTable(
  "auth_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    email: varchar("email", { length: 255 }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    attempts: integer("attempts").notNull().default(0),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_auth_tokens_hash").on(t.tokenHash),
    index("idx_auth_tokens_user").on(t.userId),
    index("idx_auth_tokens_purpose").on(t.purpose),
    index("idx_auth_tokens_expires").on(t.expiresAt),
  ],
);

export type AuthToken = typeof authTokensTable.$inferSelect;

export const backgroundJobsTable = pgTable(
  "background_jobs",
  {
    id: serial("id").primaryKey(),
    jobType: varchar("job_type", { length: 64 }).notNull(),
    payload: text("payload").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    lockedAt: timestamp("locked_at"),
    completedAt: timestamp("completed_at"),
    lastError: text("last_error"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_jobs_status_available").on(t.status, t.availableAt),
    uniqueIndex("uq_jobs_idempotency").on(t.idempotencyKey),
  ],
);

export type BackgroundJob = typeof backgroundJobsTable.$inferSelect;

export const fileDerivativesTable = pgTable(
  "file_derivatives",
  {
    id: serial("id").primaryKey(),
    fileId: integer("file_id")
      .references(() => uploadedFilesTable.id)
      .notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    byteSize: integer("byte_size"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_file_derivatives_file").on(t.fileId),
    uniqueIndex("uq_file_derivative_kind").on(t.fileId, t.kind),
  ],
);

export type FileDerivative = typeof fileDerivativesTable.$inferSelect;
