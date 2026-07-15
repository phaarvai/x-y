import { Router } from "express";
import {
  db,
  bookingsTable,
  disputesTable,
  disputeEvidenceTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
  isAllowedUpload,
} from "../lib/auth";
import {
  createDisputeBody,
  updateDisputeBody,
  updateDisputeStatusBody,
  closeDisputeBody,
  disputeEvidenceBody,
} from "../lib/legal-schemas";

const router = Router();

function serializeDispute(d: typeof disputesTable.$inferSelect) {
  return {
    id: d.id,
    bookingId: d.bookingId,
    openedBy: d.openedBy,
    againstUser: d.againstUser,
    category: d.category,
    reason: d.reason,
    description: d.description,
    status: d.status,
    priority: d.priority,
    resolutionNotes: d.resolutionNotes,
    closedBy: d.closedBy,
    closedAt: d.closedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.post("/bookings/:id/disputes", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bookingId = parseInt(req.params.id, 10);
  if (Number.isNaN(bookingId)) return res.status(400).json({ error: "Invalid id" });

  const parsed = createDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId))
    .limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const isParty =
    booking.visionaryUserId === user.id || booking.manufacturerUserId === user.id || isAdmin(user);
  if (!isParty) return res.status(403).json({ error: "Forbidden" });

  const data = parsed.data;
  const againstUser =
    data.againstUser ??
    (booking.visionaryUserId === user.id ? booking.manufacturerUserId : booking.visionaryUserId);

  const [dispute] = await db
    .insert(disputesTable)
    .values({
      bookingId,
      openedBy: user.id,
      againstUser,
      category: data.category,
      reason: escapeHtml(data.reason),
      description: escapeHtml(data.description),
      status: "OPEN",
      priority: data.priority ?? "NORMAL",
    })
    .returning();

  await db
    .update(bookingsTable)
    .set({ status: "DISPUTED", updatedAt: new Date() })
    .where(eq(bookingsTable.id, bookingId));

  await writeAuditLog({
    actorUserId: user.id,
    action: "DISPUTE_OPENED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { bookingId },
    ipAddress: clientIp(req),
  });

  const notifyIds = [booking.visionaryUserId, booking.manufacturerUserId, againstUser].filter(
    (id, idx, arr) => id && id !== user.id && arr.indexOf(id) === idx,
  ) as number[];

  for (const uid of notifyIds) {
    await createNotification({
      userId: uid,
      eventType: "DISPUTE_OPENED",
      title: "Dispute opened",
      description: `A dispute was opened on booking ${booking.reference}: ${data.reason}`,
      relatedType: "Dispute",
      relatedId: dispute.id,
      category: "DISPUTE",
    });
  }

  return res.status(201).json(serializeDispute(dispute));
});

router.get("/disputes", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const {
    status,
    priority,
    bookingId,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit || "20", 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (!isAdmin(user)) {
    conditions.push(
      sql`(${disputesTable.openedBy} = ${user.id} OR ${disputesTable.againstUser} = ${user.id})`,
    );
  }
  if (status) conditions.push(eq(disputesTable.status, status));
  if (priority) conditions.push(eq(disputesTable.priority, priority));
  if (bookingId) conditions.push(eq(disputesTable.bookingId, parseInt(bookingId, 10)));

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(disputesTable)
    .where(where)
    .orderBy(desc(disputesTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(disputesTable)
    .where(where);

  return res.status(200).json({
    items: rows.map(serializeDispute),
    total: count,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/disputes/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!dispute) return res.status(404).json({ error: "Dispute not found" });

  const canView =
    isAdmin(user) || dispute.openedBy === user.id || dispute.againstUser === user.id;
  if (!canView) return res.status(403).json({ error: "Forbidden" });

  const evidence = await db
    .select()
    .from(disputeEvidenceTable)
    .where(eq(disputeEvidenceTable.disputeId, id))
    .orderBy(desc(disputeEvidenceTable.createdAt));

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, dispute.bookingId))
    .limit(1);

  return res.status(200).json({
    ...serializeDispute(dispute),
    booking: booking
      ? {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          visionaryUserId: booking.visionaryUserId,
          manufacturerUserId: booking.manufacturerUserId,
        }
      : null,
    evidence: evidence.map((e) => ({
      id: e.id,
      disputeId: e.disputeId,
      fileUrl: e.fileUrl,
      fileName: e.fileName,
      fileType: e.fileType,
      uploadedBy: e.uploadedBy,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.put("/disputes/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Dispute not found" });

  if (!isAdmin(user) && existing.openedBy !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (["CLOSED", "RESOLVED", "REJECTED"].includes(existing.status) && !isAdmin(user)) {
    return res.status(409).json({ error: "Dispute is closed" });
  }

  const data = parsed.data;
  const [updated] = await db
    .update(disputesTable)
    .set({
      ...(data.category != null ? { category: data.category } : {}),
      ...(data.reason != null ? { reason: escapeHtml(data.reason) } : {}),
      ...(data.description != null ? { description: escapeHtml(data.description) } : {}),
      ...(data.priority != null ? { priority: data.priority } : {}),
      ...(data.resolutionNotes !== undefined
        ? { resolutionNotes: data.resolutionNotes ? escapeHtml(data.resolutionNotes) : null }
        : {}),
      ...(data.againstUser !== undefined ? { againstUser: data.againstUser } : {}),
      updatedAt: new Date(),
    })
    .where(eq(disputesTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "DISPUTE_UPDATED",
    entityType: "Dispute",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeDispute(updated));
});

router.post("/disputes/:id/evidence", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = disputeEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!dispute) return res.status(404).json({ error: "Dispute not found" });

  const canUpload =
    isAdmin(user) || dispute.openedBy === user.id || dispute.againstUser === user.id;
  if (!canUpload) return res.status(403).json({ error: "Forbidden" });

  if (!isAllowedUpload(parsed.data.fileName, parsed.data.fileType)) {
    return res.status(415).json({ error: "File type not allowed" });
  }

  const [evidence] = await db
    .insert(disputeEvidenceTable)
    .values({
      disputeId: id,
      fileUrl: parsed.data.fileUrl,
      fileName: escapeHtml(parsed.data.fileName),
      fileType: parsed.data.fileType,
      uploadedBy: user.id,
    })
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "EVIDENCE_UPLOADED",
    entityType: "DisputeEvidence",
    entityId: evidence.id,
    metadata: { disputeId: id },
    ipAddress: clientIp(req),
  });

  const notifyIds = [dispute.openedBy, dispute.againstUser].filter(
    (uid): uid is number => !!uid && uid !== user.id,
  );
  for (const uid of notifyIds) {
    await createNotification({
      userId: uid,
      eventType: "EVIDENCE_UPLOADED",
      title: "Dispute evidence uploaded",
      description: `New evidence added to dispute #${id}`,
      relatedType: "Dispute",
      relatedId: id,
      category: "DISPUTE",
    });
  }

  return res.status(201).json({
    id: evidence.id,
    disputeId: evidence.disputeId,
    fileUrl: evidence.fileUrl,
    fileName: evidence.fileName,
    fileType: evidence.fileType,
    uploadedBy: evidence.uploadedBy,
    createdAt: evidence.createdAt.toISOString(),
  });
});

router.patch("/disputes/:id/status", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateDisputeStatusBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Dispute not found" });

  const [updated] = await db
    .update(disputesTable)
    .set({
      status: parsed.data.status,
      resolutionNotes:
        parsed.data.resolutionNotes != null
          ? escapeHtml(parsed.data.resolutionNotes)
          : existing.resolutionNotes,
      updatedAt: new Date(),
      ...(parsed.data.status === "CLOSED" || parsed.data.status === "RESOLVED"
        ? { closedBy: user.id, closedAt: new Date() }
        : {}),
    })
    .where(eq(disputesTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "DISPUTE_STATUS_UPDATED",
    entityType: "Dispute",
    entityId: id,
    metadata: { status: parsed.data.status },
    ipAddress: clientIp(req),
  });

  const parties = [existing.openedBy, existing.againstUser].filter(
    (uid): uid is number => !!uid,
  );
  for (const uid of parties) {
    await createNotification({
      userId: uid,
      eventType: "DISPUTE_UPDATED",
      title: "Dispute status updated",
      description: `Dispute #${id} is now ${parsed.data.status}.`,
      relatedType: "Dispute",
      relatedId: id,
      category: "DISPUTE",
    });
    if (parsed.data.status === "RESOLVED") {
      await createNotification({
        userId: uid,
        eventType: "DISPUTE_RESOLVED",
        title: "Dispute resolved",
        description: `Dispute #${id} has been resolved.`,
        relatedType: "Dispute",
        relatedId: id,
        category: "DISPUTE",
      });
    }
  }

  return res.status(200).json(serializeDispute(updated));
});

router.patch("/disputes/:id/close", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Only admins may close disputes" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = closeDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Dispute not found" });

  const [updated] = await db
    .update(disputesTable)
    .set({
      status: "CLOSED",
      resolutionNotes: escapeHtml(parsed.data.resolutionNotes),
      closedBy: user.id,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(disputesTable.id, id))
    .returning();

  // Restore booking out of DISPUTED if no other open disputes
  const openOthers = await db
    .select()
    .from(disputesTable)
    .where(
      and(
        eq(disputesTable.bookingId, existing.bookingId),
        sql`${disputesTable.status} NOT IN ('CLOSED','RESOLVED','REJECTED')`,
        sql`${disputesTable.id} <> ${id}`,
      ),
    )
    .limit(1);

  if (openOthers.length === 0) {
    await db
      .update(bookingsTable)
      .set({ status: "CONFIRMED", updatedAt: new Date() })
      .where(eq(bookingsTable.id, existing.bookingId));
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "DISPUTE_CLOSED",
    entityType: "Dispute",
    entityId: id,
    ipAddress: clientIp(req),
  });

  const parties = [existing.openedBy, existing.againstUser].filter(
    (uid): uid is number => !!uid,
  );
  for (const uid of parties) {
    await createNotification({
      userId: uid,
      eventType: "DISPUTE_CLOSED",
      title: "Dispute closed",
      description: `Dispute #${id} was closed by an administrator.`,
      relatedType: "Dispute",
      relatedId: id,
      category: "DISPUTE",
    });
  }

  return res.status(200).json(serializeDispute(updated));
});

export default router;
