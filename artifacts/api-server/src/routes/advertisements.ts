import crypto from "crypto";
import { Router } from "express";
import {
  db,
  advertisementsTable,
  advertisementAnalyticsTable,
  advertisementEventsTable,
} from "@workspace/db";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import { createAdBody, updateAdBody, rejectAdBody, AD_PLACEMENTS } from "../lib/payment-schemas";

const router = Router();

function serializeAd(a: typeof advertisementsTable.$inferSelect) {
  return {
    ...a,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate.toISOString(),
    approvedAt: a.approvedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function isSafeImageUrl(url: string | null | undefined) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) && !/\.(exe|js|bat|cmd|sh)(\?|$)/i.test(u.pathname);
  } catch {
    return false;
  }
}

async function expireAds() {
  const now = new Date();
  const expired = await db
    .select()
    .from(advertisementsTable)
    .where(
      and(
        or(eq(advertisementsTable.status, "RUNNING"), eq(advertisementsTable.status, "APPROVED"))!,
        lte(advertisementsTable.endDate, now),
      ),
    );
  for (const ad of expired) {
    await db
      .update(advertisementsTable)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(advertisementsTable.id, ad.id));
    await createNotification({
      userId: ad.ownerUserId,
      eventType: "ADVERTISEMENT_EXPIRED",
      title: "Advertisement expired",
      description: `"${ad.title}" has expired and is no longer shown.`,
      relatedType: "Advertisement",
      relatedId: ad.id,
      category: "ADS",
    });
    await writeAuditLog({
      action: "ADVERTISEMENT_EXPIRED",
      entityType: "Advertisement",
      entityId: ad.id,
    });
  }
}

function visitorHash(req: { headers: Record<string, unknown>; ip?: string }, adId: number) {
  const ip =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : null) ||
    req.ip ||
    "unknown";
  const ua = String(req.headers["user-agent"] || "");
  return crypto.createHash("sha256").update(`${adId}:${ip}:${ua}`).digest("hex");
}

router.post("/advertisements", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = createAdBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  if (!isSafeImageUrl(parsed.data.imageUrl)) {
    return res.status(400).json({ error: "Invalid image URL" });
  }

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (!(end > start)) return res.status(400).json({ error: "endDate must be after startDate" });

  const [ad] = await db
    .insert(advertisementsTable)
    .values({
      ownerUserId: user.id,
      title: escapeHtml(parsed.data.title),
      description: parsed.data.description ? escapeHtml(parsed.data.description) : null,
      imageUrl: parsed.data.imageUrl ?? null,
      destinationUrl: parsed.data.destinationUrl,
      placement: parsed.data.placement,
      category: parsed.data.category ?? null,
      status: "PENDING",
      startDate: start,
      endDate: end,
      budget: parsed.data.budget != null ? String(parsed.data.budget) : "0",
      remainingCredits: parsed.data.remainingCredits ?? 100,
    })
    .returning();

  await db.insert(advertisementAnalyticsTable).values({ advertisementId: ad.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_CREATED",
    entityType: "Advertisement",
    entityId: ad.id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: user.id,
    eventType: "ADVERTISEMENT_SUBMITTED",
    title: "Advertisement submitted",
    description: "Your ad is pending admin approval.",
    relatedType: "Advertisement",
    relatedId: ad.id,
    category: "ADS",
  });

  return res.status(201).json(serializeAd(ad));
});

router.get("/advertisements", async (req, res) => {
  await expireAds();
  const placement = req.query.placement ? String(req.query.placement) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const mine = req.query.mine === "true";
  const activeOnly = req.query.active === "true";
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

  let ownerId: number | null = null;
  if (mine) {
    const user = await requireUser(req, res);
    if (!user) return;
    ownerId = user.id;
  }

  const now = new Date();
  const conditions = [];
  if (ownerId) conditions.push(eq(advertisementsTable.ownerUserId, ownerId));
  if (placement && (AD_PLACEMENTS as readonly string[]).includes(placement)) {
    conditions.push(eq(advertisementsTable.placement, placement));
  }
  if (category) conditions.push(eq(advertisementsTable.category, category));
  if (activeOnly) {
    conditions.push(eq(advertisementsTable.status, "RUNNING"));
    conditions.push(lte(advertisementsTable.startDate, now));
    conditions.push(gte(advertisementsTable.endDate, now));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(advertisementsTable)
    .where(where)
    .orderBy(desc(advertisementsTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return res.status(200).json({ items: rows.map(serializeAd), page, limit });
});

router.get("/advertisements/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [ad] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
  if (!ad) return res.status(404).json({ error: "Advertisement not found" });
  const [analytics] = await db
    .select()
    .from(advertisementAnalyticsTable)
    .where(eq(advertisementAnalyticsTable.advertisementId, id))
    .limit(1);
  return res.status(200).json({ ...serializeAd(ad), analytics: analytics ?? null });
});

router.put("/advertisements/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Advertisement not found" });
  if (existing.ownerUserId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  if (["RUNNING", "APPROVED"].includes(existing.status) && !isAdmin(user)) {
    return res.status(409).json({ error: "Cannot edit active ads; pause or wait for expiry" });
  }

  const parsed = updateAdBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  if (parsed.data.imageUrl !== undefined && !isSafeImageUrl(parsed.data.imageUrl)) {
    return res.status(400).json({ error: "Invalid image URL" });
  }

  const d = parsed.data;
  const [updated] = await db
    .update(advertisementsTable)
    .set({
      ...(d.title != null ? { title: escapeHtml(d.title) } : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
      ...(d.imageUrl !== undefined ? { imageUrl: d.imageUrl } : {}),
      ...(d.destinationUrl != null ? { destinationUrl: d.destinationUrl } : {}),
      ...(d.placement != null ? { placement: d.placement } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.startDate != null ? { startDate: new Date(d.startDate) } : {}),
      ...(d.endDate != null ? { endDate: new Date(d.endDate) } : {}),
      ...(d.budget != null ? { budget: String(d.budget) } : {}),
      ...(d.remainingCredits != null ? { remainingCredits: d.remainingCredits } : {}),
      status: existing.status === "REJECTED" ? "PENDING" : existing.status,
      updatedAt: new Date(),
    })
    .where(eq(advertisementsTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_UPDATED",
    entityType: "Advertisement",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serializeAd(updated));
});

router.delete("/advertisements/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Advertisement not found" });
  if (existing.ownerUserId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

  await db
    .update(advertisementsTable)
    .set({ status: "EXPIRED", updatedAt: new Date() })
    .where(eq(advertisementsTable.id, id));

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_DELETED",
    entityType: "Advertisement",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({ message: "Advertisement removed" });
});

router.post("/advertisements/:id/impression", async (req, res) => {
  await expireAds();
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [ad] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
  if (!ad || ad.status !== "RUNNING") return res.status(404).json({ error: "Ad not running" });

  const hash = visitorHash(req as any, id);
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [recent] = await db
    .select()
    .from(advertisementEventsTable)
    .where(
      and(
        eq(advertisementEventsTable.advertisementId, id),
        eq(advertisementEventsTable.eventType, "IMPRESSION"),
        eq(advertisementEventsTable.visitorHash, hash),
        gte(advertisementEventsTable.createdAt, since),
      ),
    )
    .limit(1);
  if (recent) return res.status(200).json({ counted: false });

  await db.insert(advertisementEventsTable).values({
    advertisementId: id,
    eventType: "IMPRESSION",
    visitorHash: hash,
  });
  await db
    .update(advertisementAnalyticsTable)
    .set({
      impressions: sql`${advertisementAnalyticsTable.impressions} + 1`,
      lastViewedAt: new Date(),
      ctr: sql`CASE WHEN ${advertisementAnalyticsTable.impressions} + 1 > 0 THEN (${advertisementAnalyticsTable.clicks}::numeric / (${advertisementAnalyticsTable.impressions} + 1)) ELSE 0 END`,
      updatedAt: new Date(),
    })
    .where(eq(advertisementAnalyticsTable.advertisementId, id));

  return res.status(200).json({ counted: true });
});

router.post("/advertisements/:id/click", async (req, res) => {
  await expireAds();
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [ad] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
  if (!ad || ad.status !== "RUNNING") return res.status(404).json({ error: "Ad not running" });

  const hash = visitorHash(req as any, id);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent] = await db
    .select()
    .from(advertisementEventsTable)
    .where(
      and(
        eq(advertisementEventsTable.advertisementId, id),
        eq(advertisementEventsTable.eventType, "CLICK"),
        eq(advertisementEventsTable.visitorHash, hash),
        gte(advertisementEventsTable.createdAt, since),
      ),
    )
    .limit(1);
  if (recent) {
    return res.status(200).json({ counted: false, destinationUrl: ad.destinationUrl });
  }

  await db.insert(advertisementEventsTable).values({
    advertisementId: id,
    eventType: "CLICK",
    visitorHash: hash,
  });
  await db
    .update(advertisementAnalyticsTable)
    .set({
      clicks: sql`${advertisementAnalyticsTable.clicks} + 1`,
      lastClickedAt: new Date(),
      ctr: sql`CASE WHEN ${advertisementAnalyticsTable.impressions} > 0 THEN ((${advertisementAnalyticsTable.clicks} + 1)::numeric / ${advertisementAnalyticsTable.impressions}) ELSE 0 END`,
      updatedAt: new Date(),
    })
    .where(eq(advertisementAnalyticsTable.advertisementId, id));
  if (ad.remainingCredits > 0) {
    await db
      .update(advertisementsTable)
      .set({ remainingCredits: ad.remainingCredits - 1, updatedAt: new Date() })
      .where(eq(advertisementsTable.id, id));
  }

  return res.status(200).json({ counted: true, destinationUrl: ad.destinationUrl });
});

// Admin moderation
router.patch("/admin/advertisements/:id/approve", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(advertisementsTable)
    .set({
      status: "RUNNING",
      approvedBy: user.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(advertisementsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Advertisement not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_APPROVED",
    entityType: "Advertisement",
    entityId: id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: updated.ownerUserId,
    eventType: "ADVERTISEMENT_APPROVED",
    title: "Advertisement approved",
    description: `"${updated.title}" is now running.`,
    relatedType: "Advertisement",
    relatedId: id,
    category: "ADS",
  });
  return res.status(200).json(serializeAd(updated));
});

router.patch("/admin/advertisements/:id/reject", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = rejectAdBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [updated] = await db
    .update(advertisementsTable)
    .set({
      status: "REJECTED",
      rejectionReason: escapeHtml(parsed.data.reason),
      updatedAt: new Date(),
    })
    .where(eq(advertisementsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Advertisement not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_REJECTED",
    entityType: "Advertisement",
    entityId: id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: updated.ownerUserId,
    eventType: "ADVERTISEMENT_REJECTED",
    title: "Advertisement rejected",
    description: parsed.data.reason,
    relatedType: "Advertisement",
    relatedId: id,
    category: "ADS",
  });
  return res.status(200).json(serializeAd(updated));
});

router.patch("/admin/advertisements/:id/pause", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(advertisementsTable)
    .set({ status: "PAUSED", updatedAt: new Date() })
    .where(eq(advertisementsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Advertisement not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_PAUSED",
    entityType: "Advertisement",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serializeAd(updated));
});

router.patch("/admin/advertisements/:id/resume", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(advertisementsTable)
    .set({ status: "RUNNING", updatedAt: new Date() })
    .where(eq(advertisementsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Advertisement not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADVERTISEMENT_RESUMED",
    entityType: "Advertisement",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serializeAd(updated));
});

export default router;
