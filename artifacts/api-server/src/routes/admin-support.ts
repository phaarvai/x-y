import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db, supportCasesTable, disputesTable, usersTable } from "@workspace/db";
import { createNotification, escapeHtml } from "../lib/auth";
import { logAdminAction, requireAdmin } from "../lib/admin-rbac";

const router = Router();

const SUPPORT_STATUSES = ["OPEN", "ASSIGNED", "WAITING_FOR_USER", "RESOLVED", "CLOSED"] as const;
const SUPPORT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function serializeCase(c: typeof supportCasesTable.$inferSelect) {
  return {
    ...c,
    closedAt: c.closedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function serializeDispute(d: typeof disputesTable.$inferSelect) {
  return {
    ...d,
    closedAt: d.closedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/admin/support", async (req, res) => {
  const admin = await requireAdmin(req, res, "support", "read");
  if (!admin) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : undefined;
  const priority = req.query.priority ? String(req.query.priority) : undefined;
  const assignedAdmin = req.query.assignedAdmin
    ? parseInt(String(req.query.assignedAdmin), 10)
    : undefined;
  const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
  const bookingId = req.query.bookingId ? parseInt(String(req.query.bookingId), 10) : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const conditions = [];
  if (status && (SUPPORT_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(supportCasesTable.status, status));
  }
  if (priority && (SUPPORT_PRIORITIES as readonly string[]).includes(priority)) {
    conditions.push(eq(supportCasesTable.priority, priority));
  }
  if (assignedAdmin && !Number.isNaN(assignedAdmin)) {
    conditions.push(eq(supportCasesTable.assignedAdmin, assignedAdmin));
  }
  if (userId && !Number.isNaN(userId)) conditions.push(eq(supportCasesTable.userId, userId));
  if (bookingId && !Number.isNaN(bookingId)) conditions.push(eq(supportCasesTable.bookingId, bookingId));
  if (from && !Number.isNaN(from.getTime())) conditions.push(gte(supportCasesTable.createdAt, from));
  if (to && !Number.isNaN(to.getTime())) conditions.push(lte(supportCasesTable.createdAt, to));
  if (q) {
    conditions.push(or(ilike(supportCasesTable.subject, `%${q}%`), ilike(supportCasesTable.description, `%${q}%`))!);
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(supportCasesTable)
    .where(where)
    .orderBy(desc(supportCasesTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportCasesTable)
    .where(where);

  return res.json({ items: rows.map(serializeCase), total: count, page, limit });
});

const createSupportBody = z.object({
  userId: z.number().int().positive(),
  bookingId: z.number().int().positive().optional(),
  subject: z.string().min(3).max(255),
  description: z.string().min(3).max(10000),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  assignedAdmin: z.number().int().positive().optional(),
});

router.post("/admin/support", async (req, res) => {
  const admin = await requireAdmin(req, res, "support", "write");
  if (!admin) return;

  const parsed = createSupportBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [row] = await db
    .insert(supportCasesTable)
    .values({
      userId: parsed.data.userId,
      bookingId: parsed.data.bookingId ?? null,
      subject: escapeHtml(parsed.data.subject),
      description: escapeHtml(parsed.data.description),
      priority: parsed.data.priority ?? "MEDIUM",
      status: parsed.data.assignedAdmin ? "ASSIGNED" : "OPEN",
      assignedAdmin: parsed.data.assignedAdmin ?? null,
    })
    .returning();

  await logAdminAction(admin, "SUPPORT_CASE_CREATED", "SupportCase", row.id, {}, req);

  if (row.assignedAdmin) {
    await createNotification({
      userId: row.assignedAdmin,
      eventType: "SUPPORT_CASE_ASSIGNED",
      title: "Support case assigned",
      description: `Case #${row.id}: ${row.subject}`,
      relatedType: "SupportCase",
      relatedId: row.id,
      category: "ADMIN",
    });
  }

  return res.status(201).json(serializeCase(row));
});

router.get("/admin/disputes", async (req, res) => {
  const admin = await requireAdmin(req, res, "disputes", "read");
  if (!admin) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : undefined;
  const priority = req.query.priority ? String(req.query.priority) : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;

  const conditions = [];
  if (status) conditions.push(eq(disputesTable.status, status));
  if (priority) conditions.push(eq(disputesTable.priority, priority));
  if (q) {
    conditions.push(
      or(ilike(disputesTable.reason, `%${q}%`), ilike(disputesTable.description, `%${q}%`))!,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(disputesTable)
    .where(where)
    .orderBy(desc(disputesTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(disputesTable).where(where);
  return res.json({ items: rows.map(serializeDispute), total: count, page, limit });
});

router.get("/admin/disputes/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "disputes", "read");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(serializeDispute(row));
});

router.patch("/admin/disputes/:id/assign", async (req, res) => {
  const admin = await requireAdmin(req, res, "disputes", "assign");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = z.object({ assignedAdmin: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(disputesTable)
    .set({
      status: existing.status === "OPEN" ? "UNDER_REVIEW" : existing.status,
      priority: existing.priority,
      updatedAt: new Date(),
    })
    .where(eq(disputesTable.id, id))
    .returning();

  await logAdminAction(
    admin,
    "DISPUTE_ASSIGNED",
    "Dispute",
    id,
    { assignedAdmin: parsed.data.assignedAdmin },
    req,
  );

  await createNotification({
    userId: parsed.data.assignedAdmin,
    eventType: "DISPUTE_ASSIGNED",
    title: "Dispute assigned",
    description: `Dispute #${id} has been assigned to you.`,
    relatedType: "Dispute",
    relatedId: id,
    category: "ADMIN",
  });

  for (const uid of [existing.openedBy, existing.againstUser].filter(Boolean) as number[]) {
    await createNotification({
      userId: uid,
      eventType: "DISPUTE_STATUS_CHANGED",
      title: "Dispute update",
      description: `Dispute #${id} is under review.`,
      relatedType: "Dispute",
      relatedId: id,
      category: "LEGAL",
    });
  }

  return res.json(serializeDispute(updated));
});

router.patch("/admin/disputes/:id/status", async (req, res) => {
  const admin = await requireAdmin(req, res, "disputes", "write");
  if (!admin) return;
  if (!admin.isSuperAdmin && !admin.adminRoles.includes("SUPPORT_ADMIN")) {
    return res.status(403).json({ error: "Only Support Admin or Super Admin can resolve disputes" });
  }

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = z
    .object({
      status: z.enum(["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "CLOSED"]),
      resolutionNotes: z.string().max(5000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const done = ["RESOLVED", "REJECTED", "CLOSED"].includes(parsed.data.status);
  const [updated] = await db
    .update(disputesTable)
    .set({
      status: parsed.data.status,
      resolutionNotes: parsed.data.resolutionNotes
        ? escapeHtml(parsed.data.resolutionNotes)
        : existing.resolutionNotes,
      closedBy: done ? admin.id : existing.closedBy,
      closedAt: done ? new Date() : existing.closedAt,
      updatedAt: new Date(),
    })
    .where(eq(disputesTable.id, id))
    .returning();

  await logAdminAction(admin, "DISPUTE_STATUS_UPDATED", "Dispute", id, parsed.data, req);

  for (const uid of [existing.openedBy, existing.againstUser].filter(Boolean) as number[]) {
    await createNotification({
      userId: uid,
      eventType: done ? "DISPUTE_RESOLVED" : "DISPUTE_STATUS_CHANGED",
      title: done ? "Dispute resolved" : "Dispute update",
      description: `Dispute #${id} is now ${parsed.data.status}.`,
      relatedType: "Dispute",
      relatedId: id,
      category: "LEGAL",
    });
  }

  return res.json(serializeDispute(updated));
});

router.patch("/admin/disputes/:id/close", async (req, res) => {
  const admin = await requireAdmin(req, res, "disputes", "write");
  if (!admin) return;
  if (!admin.isSuperAdmin && !admin.adminRoles.includes("SUPPORT_ADMIN")) {
    return res.status(403).json({ error: "Only Support Admin or Super Admin can close disputes" });
  }

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = z.object({ resolutionNotes: z.string().max(5000).optional() }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(disputesTable)
    .set({
      status: "CLOSED",
      resolutionNotes: parsed.data.resolutionNotes
        ? escapeHtml(parsed.data.resolutionNotes)
        : existing.resolutionNotes,
      closedBy: admin.id,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(disputesTable.id, id))
    .returning();

  await logAdminAction(admin, "DISPUTE_CLOSED", "Dispute", id, {}, req);

  for (const uid of [existing.openedBy, existing.againstUser].filter(Boolean) as number[]) {
    await createNotification({
      userId: uid,
      eventType: "DISPUTE_RESOLVED",
      title: "Dispute closed",
      description: `Dispute #${id} has been closed.`,
      relatedType: "Dispute",
      relatedId: id,
      category: "LEGAL",
    });
  }

  return res.json(serializeDispute(updated));
});

export default router;
