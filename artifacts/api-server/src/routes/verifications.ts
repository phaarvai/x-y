import { Router } from "express";
import {
  db,
  verificationsTable,
  verificationHistoryTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import { createVerificationBody, updateVerificationBody } from "../lib/review-schemas";
import {
  serializeVerification,
  expireStaleVerifications,
  getActiveVerification,
} from "../lib/review-service";

const router = Router();

async function appendHistory(params: {
  verificationId: number;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  performedBy?: number | null;
  notes?: string | null;
}) {
  await db.insert(verificationHistoryTable).values({
    verificationId: params.verificationId,
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    performedBy: params.performedBy ?? null,
    notes: params.notes ?? null,
  });
}

router.post("/admin/verifications", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const parsed = createVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [row] = await db
    .insert(verificationsTable)
    .values({
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      verificationType: parsed.data.verificationType,
      status: "PENDING",
      verificationReason: parsed.data.verificationReason
        ? escapeHtml(parsed.data.verificationReason)
        : null,
      notes: parsed.data.notes ? escapeHtml(parsed.data.notes) : null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .returning();

  await appendHistory({
    verificationId: row.id,
    action: "CREATED",
    fromStatus: null,
    toStatus: "PENDING",
    performedBy: user.id,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "VERIFICATION_CREATED",
    entityType: "Verification",
    entityId: row.id,
    ipAddress: clientIp(req),
  });

  return res.status(201).json(serializeVerification(row));
});

router.get("/admin/verifications", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  await expireStaleVerifications();

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : undefined;
  const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
  const verificationType = req.query.verificationType ? String(req.query.verificationType) : undefined;

  const conditions = [];
  if (status) conditions.push(eq(verificationsTable.status, status));
  if (entityType) conditions.push(eq(verificationsTable.entityType, entityType));
  if (verificationType) conditions.push(eq(verificationsTable.verificationType, verificationType));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(verificationsTable)
    .where(where)
    .orderBy(desc(verificationsTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(verificationsTable)
    .where(where);

  return res.status(200).json({
    items: rows.map(serializeVerification),
    total: count,
    page,
    limit,
  });
});

router.patch("/admin/verifications/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db.select().from(verificationsTable).where(eq(verificationsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Verification not found" });

  let nextStatus = parsed.data.status ?? existing.status;
  let action = parsed.data.action ?? "UPDATED";
  if (parsed.data.action === "APPROVE") {
    nextStatus = "VERIFIED";
    action = "APPROVED";
  } else if (parsed.data.action === "REJECT") {
    nextStatus = "REJECTED";
    action = "REJECTED";
  } else if (parsed.data.action === "REVOKE") {
    nextStatus = "REVOKED";
    action = "REVOKED";
  } else if (parsed.data.action === "RENEW") {
    nextStatus = "VERIFIED";
    action = "RENEWED";
  }

  const expiresAt =
    parsed.data.expiresAt !== undefined
      ? parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null
      : action === "RENEW" && !parsed.data.expiresAt
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : existing.expiresAt;

  const [updated] = await db
    .update(verificationsTable)
    .set({
      status: nextStatus,
      notes: parsed.data.notes != null ? escapeHtml(parsed.data.notes) : existing.notes,
      verificationReason:
        parsed.data.verificationReason != null
          ? escapeHtml(parsed.data.verificationReason)
          : existing.verificationReason,
      verifiedBy: nextStatus === "VERIFIED" ? user.id : existing.verifiedBy,
      verifiedAt: nextStatus === "VERIFIED" ? new Date() : existing.verifiedAt,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(verificationsTable.id, id))
    .returning();

  await appendHistory({
    verificationId: id,
    action,
    fromStatus: existing.status,
    toStatus: nextStatus,
    performedBy: user.id,
    notes: parsed.data.notes,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: `VERIFICATION_${action}`,
    entityType: "Verification",
    entityId: id,
    ipAddress: clientIp(req),
  });

  // Notify entity owner when entity is USER (entityId = userId)
  if (updated.entityType === "USER" || updated.entityType === "MANUFACTURER" || updated.entityType === "LEGAL_PROVIDER") {
    if (nextStatus === "VERIFIED") {
      await createNotification({
        userId: updated.entityId,
        eventType: "VERIFIED_BADGE_AWARDED",
        title: "Verified badge awarded",
        description: `Your ${updated.verificationType.toLowerCase()} verification was approved.`,
        relatedType: "Verification",
        relatedId: id,
        category: "TRUST",
      });
    } else if (nextStatus === "REVOKED") {
      await createNotification({
        userId: updated.entityId,
        eventType: "VERIFICATION_REVOKED",
        title: "Verification revoked",
        description: "Your verified badge has been revoked.",
        relatedType: "Verification",
        relatedId: id,
        category: "TRUST",
      });
    } else if (nextStatus === "EXPIRED") {
      await createNotification({
        userId: updated.entityId,
        eventType: "VERIFICATION_EXPIRED",
        title: "Verification expired",
        description: "Your verified badge has expired.",
        relatedType: "Verification",
        relatedId: id,
        category: "TRUST",
      });
    }
  }

  const history = await db
    .select()
    .from(verificationHistoryTable)
    .where(eq(verificationHistoryTable.verificationId, id))
    .orderBy(desc(verificationHistoryTable.createdAt));

  return res.status(200).json({
    ...serializeVerification(updated),
    history: history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  });
});

router.get("/verifications/:entityType/:entityId", async (req, res) => {
  await expireStaleVerifications();
  const entityType = String(req.params.entityType).toUpperCase();
  const entityId = parseInt(req.params.entityId, 10);
  if (Number.isNaN(entityId)) return res.status(400).json({ error: "Invalid entity id" });

  const active = await getActiveVerification(entityType, entityId);
  const all = await db
    .select()
    .from(verificationsTable)
    .where(and(eq(verificationsTable.entityType, entityType), eq(verificationsTable.entityId, entityId)))
    .orderBy(desc(verificationsTable.createdAt));

  return res.status(200).json({
    isVerified: !!active,
    active: active ? serializeVerification(active) : null,
    items: all.map(serializeVerification),
  });
});

export default router;
