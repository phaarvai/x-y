import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  listingModerationsTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
  marketOpportunitiesTable,
  advertisementsTable,
  legalServiceProvidersTable,
} from "@workspace/db";
import { createNotification, escapeHtml } from "../lib/auth";
import { logAdminAction, requireAdmin } from "../lib/admin-rbac";

const router = Router();

export const LISTING_TYPES = [
  "MANUFACTURING_FACILITY",
  "MACHINERY",
  "VENDOR",
  "LABOR",
  "LOGISTICS",
  "LEGAL_PROVIDER",
  "MARKET_OPPORTUNITY",
  "ADVERTISEMENT",
] as const;

const MODERATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "ARCHIVED",
] as const;

function serializeMod(m: typeof listingModerationsTable.$inferSelect) {
  return {
    ...m,
    reviewedAt: m.reviewedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

async function syncListingPublishState(
  listingType: string,
  listingId: number,
  status: string,
) {
  const published = status === "APPROVED";

  try {
    if (listingType === "VENDOR") {
      await db
        .update(vendorMaterialsTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(vendorMaterialsTable.id, listingId));
    } else if (listingType === "LABOR") {
      await db
        .update(laborListingsTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(laborListingsTable.id, listingId));
    } else if (listingType === "LOGISTICS") {
      await db
        .update(logisticsServicesTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(logisticsServicesTable.id, listingId));
    } else if (listingType === "MARKET_OPPORTUNITY") {
      const patch: {
        moderationStatus: string;
        status?: string;
        updatedAt: Date;
      } = {
        moderationStatus: status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : status,
        updatedAt: new Date(),
      };
      if (published) patch.status = "ACTIVE";
      else if (status === "REJECTED" || status === "CHANGES_REQUESTED") patch.status = "DRAFT";
      await db
        .update(marketOpportunitiesTable)
        .set(patch)
        .where(eq(marketOpportunitiesTable.id, listingId));
    } else if (listingType === "ADVERTISEMENT") {
      await db
        .update(advertisementsTable)
        .set({
          status: published ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(advertisementsTable.id, listingId));
    } else if (listingType === "LEGAL_PROVIDER") {
      await db
        .update(legalServiceProvidersTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(legalServiceProvidersTable.id, listingId));
    }
  } catch (err) {
    console.warn("Listing sync skipped:", err);
  }
}

router.get("/admin/listings", async (req, res) => {
  const admin = await requireAdmin(req, res, "listings", "read");
  if (!admin) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : undefined;
  const listingType = req.query.listingType ? String(req.query.listingType) : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;

  const conditions = [];
  if (status && (MODERATION_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(listingModerationsTable.status, status));
  }
  if (listingType && (LISTING_TYPES as readonly string[]).includes(listingType)) {
    conditions.push(eq(listingModerationsTable.listingType, listingType));
  }
  if (q) {
    conditions.push(
      or(ilike(listingModerationsTable.title, `%${q}%`), sql`${listingModerationsTable.listingId}::text = ${q}`)!,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(listingModerationsTable)
    .where(where)
    .orderBy(desc(listingModerationsTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listingModerationsTable)
    .where(where);

  return res.json({ items: rows.map(serializeMod), total: count, page, limit });
});

router.get("/admin/listings/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "listings", "read");
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db.select().from(listingModerationsTable).where(eq(listingModerationsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });

  let preview: unknown = null;
  try {
    if (row.listingType === "VENDOR") {
      const [r] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, row.listingId)).limit(1);
      preview = r ?? null;
    } else if (row.listingType === "LABOR") {
      const [r] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, row.listingId)).limit(1);
      preview = r ?? null;
    } else if (row.listingType === "LOGISTICS") {
      const [r] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, row.listingId)).limit(1);
      preview = r ?? null;
    } else if (row.listingType === "MARKET_OPPORTUNITY") {
      const [r] = await db
        .select()
        .from(marketOpportunitiesTable)
        .where(eq(marketOpportunitiesTable.id, row.listingId))
        .limit(1);
      preview = r ?? null;
    } else if (row.listingType === "ADVERTISEMENT") {
      const [r] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, row.listingId)).limit(1);
      preview = r ?? null;
    } else if (row.listingType === "LEGAL_PROVIDER") {
      const [r] = await db
        .select()
        .from(legalServiceProvidersTable)
        .where(eq(legalServiceProvidersTable.id, row.listingId))
        .limit(1);
      preview = r ?? null;
    }
  } catch {
    preview = null;
  }

  const history = await db
    .select()
    .from(listingModerationsTable)
    .where(
      and(
        eq(listingModerationsTable.listingType, row.listingType),
        eq(listingModerationsTable.listingId, row.listingId),
      ),
    );

  return res.json({
    moderation: serializeMod(row),
    preview,
    history: history.map(serializeMod),
  });
});

const reasonBody = z.object({
  reason: z.string().min(3).max(2000),
  internalNotes: z.string().max(5000).optional(),
});

async function applyModeration(
  req: Parameters<typeof requireAdmin>[0],
  res: Parameters<typeof requireAdmin>[1],
  status: (typeof MODERATION_STATUSES)[number],
  requireReason: boolean,
  permissionAction: "approve" | "reject",
  notifyEvent: string,
  notifyTitle: string,
) {
  const admin = await requireAdmin(req, res, "listings", permissionAction);
  if (!admin) return;

  const rawId = req.params.id;
  const id = parseInt(Array.isArray(rawId) ? rawId[0] : String(rawId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  let reason: string | undefined;
  let internalNotes: string | undefined;
  if (requireReason || req.body?.reason || req.body?.internalNotes) {
    const parsed = (requireReason ? reasonBody : reasonBody.partial()).safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: requireReason ? "Reason required" : "Invalid input" });
    reason = parsed.data.reason ? escapeHtml(parsed.data.reason) : undefined;
    internalNotes = parsed.data.internalNotes ? escapeHtml(parsed.data.internalNotes) : undefined;
  }

  const [existing] = await db.select().from(listingModerationsTable).where(eq(listingModerationsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(listingModerationsTable)
    .set({
      status,
      reviewReason: reason ?? existing.reviewReason,
      internalNotes: internalNotes ?? existing.internalNotes,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(listingModerationsTable.id, id))
    .returning();

  await syncListingPublishState(updated.listingType, updated.listingId, status);
  await logAdminAction(
    admin,
    `LISTING_${status}`,
    "ListingModeration",
    id,
    { listingType: updated.listingType, listingId: updated.listingId, reason },
    req,
  );

  if (updated.ownerUserId) {
    await createNotification({
      userId: updated.ownerUserId,
      eventType: notifyEvent,
      title: notifyTitle,
      description: reason || `Your listing "${updated.title || updated.listingId}" is now ${status}.`,
      relatedType: "ListingModeration",
      relatedId: id,
      category: "ADMIN",
    });
  }

  return res.json(serializeMod(updated));
}

router.patch("/admin/listings/:id/approve", (req, res) =>
  applyModeration(req, res, "APPROVED", false, "approve", "LISTING_APPROVED", "Listing approved"),
);

router.patch("/admin/listings/:id/reject", (req, res) =>
  applyModeration(req, res, "REJECTED", true, "reject", "LISTING_REJECTED", "Listing rejected"),
);

router.patch("/admin/listings/:id/request-changes", (req, res) =>
  applyModeration(
    req,
    res,
    "CHANGES_REQUESTED",
    true,
    "reject",
    "LISTING_CHANGES_REQUESTED",
    "Listing changes requested",
  ),
);

/** Upsert queue entry (optional helper for ops) */
router.post("/admin/listings/queue", async (req, res) => {
  const admin = await requireAdmin(req, res, "listings", "write");
  if (!admin) return;

  const parsed = z
    .object({
      listingType: z.enum(LISTING_TYPES),
      listingId: z.number().int().positive(),
      ownerUserId: z.number().int().positive().optional(),
      title: z.string().max(255).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  try {
    const [existing] = await db
      .select()
      .from(listingModerationsTable)
      .where(
        and(
          eq(listingModerationsTable.listingType, parsed.data.listingType),
          eq(listingModerationsTable.listingId, parsed.data.listingId),
        ),
      )
      .limit(1);

    let row: typeof listingModerationsTable.$inferSelect;
    if (existing) {
      [row] = await db
        .update(listingModerationsTable)
        .set({
          title: parsed.data.title ?? existing.title,
          ownerUserId: parsed.data.ownerUserId ?? existing.ownerUserId,
          status: "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(listingModerationsTable.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(listingModerationsTable)
        .values({
          listingType: parsed.data.listingType,
          listingId: parsed.data.listingId,
          ownerUserId: parsed.data.ownerUserId ?? null,
          title: parsed.data.title ?? null,
          status: "PENDING",
        })
        .returning();
    }

    await logAdminAction(admin, "LISTING_QUEUED", "ListingModeration", row.id, parsed.data, req);
    return res.status(201).json(serializeMod(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to queue listing" });
  }
});

export default router;
