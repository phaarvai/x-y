/**
 * Background job enqueue + lightweight in-process runner hooks (NFR).
 * Production: pair with a worker process / Redis queue; DB table is the source of truth.
 */

import { db } from "@/lib/db";
import { backgroundJobsTable } from "@/lib/schema";
import { and, asc, eq, lte, sql } from "drizzle-orm";

export type JobType =
  | "SEND_NOTIFICATION"
  | "SEND_EMAIL"
  | "PROCESS_IMAGE"
  | "AGGREGATE_ANALYTICS"
  | "GENERATE_REPORT";

export async function enqueueJob(
  jobType: JobType,
  payload: Record<string, unknown>,
  opts?: { idempotencyKey?: string; delayMs?: number; maxAttempts?: number },
) {
  try {
    const [row] = await db
      .insert(backgroundJobsTable)
      .values({
        jobType,
        payload: JSON.stringify(payload),
        status: "PENDING",
        maxAttempts: opts?.maxAttempts ?? 5,
        availableAt: new Date(Date.now() + (opts?.delayMs ?? 0)),
        idempotencyKey: opts?.idempotencyKey ?? null,
      })
      .returning();
    return row;
  } catch (err) {
    // Duplicate idempotency key — treat as success for retry-safe callers
    if (opts?.idempotencyKey) {
      const [existing] = await db
        .select()
        .from(backgroundJobsTable)
        .where(eq(backgroundJobsTable.idempotencyKey, opts.idempotencyKey))
        .limit(1);
      if (existing) return existing;
    }
    throw err;
  }
}

export async function claimNextJobs(limit = 5) {
  const now = new Date();
  const pending = await db
    .select()
    .from(backgroundJobsTable)
    .where(
      and(
        eq(backgroundJobsTable.status, "PENDING"),
        lte(backgroundJobsTable.availableAt, now),
      ),
    )
    .orderBy(asc(backgroundJobsTable.availableAt))
    .limit(limit);

  const claimed = [];
  for (const job of pending) {
    const [updated] = await db
      .update(backgroundJobsTable)
      .set({
        status: "RUNNING",
        lockedAt: now,
        attempts: sql`${backgroundJobsTable.attempts} + 1`,
        updatedAt: now,
      })
      .where(and(eq(backgroundJobsTable.id, job.id), eq(backgroundJobsTable.status, "PENDING")))
      .returning();
    if (updated) claimed.push(updated);
  }
  return claimed;
}

export async function completeJob(jobId: number) {
  await db
    .update(backgroundJobsTable)
    .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(backgroundJobsTable.id, jobId));
}

export async function failJob(jobId: number, error: string, maxAttempts: number, attempts: number) {
  const retry = attempts < maxAttempts;
  await db
    .update(backgroundJobsTable)
    .set({
      status: retry ? "PENDING" : "FAILED",
      lastError: error.slice(0, 2000),
      availableAt: retry ? new Date(Date.now() + Math.min(60_000 * attempts, 15 * 60_000)) : new Date(),
      lockedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobsTable.id, jobId));
}
