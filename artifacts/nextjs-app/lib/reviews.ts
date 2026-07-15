import { db } from "@/lib/db";
import {
  feedbackTable,
  ratingSummariesTable,
  platformReviewSettingsTable,
  verificationsTable,
} from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getReviewSettings() {
  const [row] = await db.select().from(platformReviewSettingsTable).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(platformReviewSettingsTable)
    .values({ moderationEnabled: true, maxCommentLength: 1000 })
    .returning();
  return created;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function recalculateRatingSummary(entityType: string, entityId: number) {
  const published = await db
    .select()
    .from(feedbackTable)
    .where(
      and(
        eq(feedbackTable.status, "PUBLISHED"),
        entityType === "FACILITY"
          ? eq(feedbackTable.facilityId, entityId)
          : eq(feedbackTable.reviewedUserId, entityId),
      ),
    );

  const count = published.length;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let overall = 0;
  let quality = 0;
  let communication = 0;
  let timeliness = 0;
  for (const r of published) {
    overall += r.overallRating;
    quality += r.qualityRating;
    communication += r.communicationRating;
    timeliness += r.timelinessRating;
    dist[r.overallRating] = (dist[r.overallRating] || 0) + 1;
  }

  const summary = {
    averageRating: String(count ? round2(overall / count) : 0),
    reviewCount: count,
    qualityAvg: String(count ? round2(quality / count) : 0),
    communicationAvg: String(count ? round2(communication / count) : 0),
    timelinessAvg: String(count ? round2(timeliness / count) : 0),
    distribution: JSON.stringify(dist),
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select()
    .from(ratingSummariesTable)
    .where(and(eq(ratingSummariesTable.entityType, entityType), eq(ratingSummariesTable.entityId, entityId)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(ratingSummariesTable)
      .set(summary)
      .where(eq(ratingSummariesTable.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(ratingSummariesTable)
    .values({ entityType, entityId, ...summary })
    .returning();
  return created;
}

export function serializeFeedback(f: typeof feedbackTable.$inferSelect) {
  return {
    ...f,
    moderatedAt: f.moderatedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export function serializeVerification(v: typeof verificationsTable.$inferSelect) {
  return {
    ...v,
    verifiedAt: v.verifiedAt?.toISOString() ?? null,
    expiresAt: v.expiresAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export function parseDistribution(raw: string | null | undefined) {
  const empty = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!raw) return empty;
  try {
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export async function expireStaleVerifications() {
  const now = new Date();
  const stale = await db
    .select()
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.status, "VERIFIED"),
        sql`${verificationsTable.expiresAt} IS NOT NULL AND ${verificationsTable.expiresAt} < ${now}`,
      ),
    );
  for (const v of stale) {
    await db
      .update(verificationsTable)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(verificationsTable.id, v.id));
  }
}

export async function getActiveVerification(entityType: string, entityId: number) {
  await expireStaleVerifications();
  const [v] = await db
    .select()
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.entityType, entityType),
        eq(verificationsTable.entityId, entityId),
        eq(verificationsTable.status, "VERIFIED"),
      ),
    )
    .limit(1);
  if (!v) return null;
  if (v.expiresAt && v.expiresAt < new Date()) return null;
  return v;
}

const recentSubmits = new Map<number, number>();
export function rateLimitReview(userId: number): boolean {
  const now = Date.now();
  const last = recentSubmits.get(userId) ?? 0;
  if (now - last < 5000) return false;
  recentSubmits.set(userId, now);
  return true;
}
