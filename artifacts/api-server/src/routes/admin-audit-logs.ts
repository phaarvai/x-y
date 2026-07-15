/**
 * EPIC 17 XFY-088 — Admin audit log APIs
 * GET /api/admin/audit-logs
 * GET /api/admin/audit-logs/:id
 */

import { Router } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../lib/admin-rbac";
import { config } from "../config/env";

const router = Router();

const listQuery = z.object({
  userId: z.coerce.number().int().positive().optional(),
  entityType: z.string().max(64).optional(),
  entityId: z.coerce.number().int().optional(),
  action: z.string().max(64).optional(),
  from: z.string().datetime().optional().or(z.string().optional()),
  to: z.string().datetime().optional().or(z.string().optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

function serialize(row: typeof auditLogsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.actorUserId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    oldValue: row.oldValue,
    newValue: row.newValue,
    metadata: row.metadata,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/admin/audit-logs", async (req, res) => {
  if (!config.featureFlags.auditApi) {
    return res.status(503).json({ error: "Audit API disabled" });
  }
  const admin = await requireAdmin(req, res, "users", "read");
  if (!admin) return;

  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  const q = parsed.data;
  const conditions = [];
  if (q.userId) conditions.push(eq(auditLogsTable.actorUserId, q.userId));
  if (q.entityType) conditions.push(eq(auditLogsTable.entityType, q.entityType));
  if (q.entityId != null) conditions.push(eq(auditLogsTable.entityId, q.entityId));
  if (q.action) conditions.push(eq(auditLogsTable.action, q.action));
  if (q.from) {
    const d = new Date(q.from);
    if (!Number.isNaN(d.getTime())) conditions.push(gte(auditLogsTable.createdAt, d));
  }
  if (q.to) {
    const d = new Date(q.to);
    if (!Number.isNaN(d.getTime())) conditions.push(lte(auditLogsTable.createdAt, d));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (q.page - 1) * q.pageSize;

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(auditLogsTable)
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(q.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogsTable)
      .where(where),
  ]);

  const total = countRow[0]?.count ?? 0;
  return res.json({
    data: rows.map(serialize),
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize) || 1,
    },
  });
});

router.get("/admin/audit-logs/:id", async (req, res) => {
  if (!config.featureFlags.auditApi) {
    return res.status(503).json({ error: "Audit API disabled" });
  }
  const admin = await requireAdmin(req, res, "users", "read");
  if (!admin) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db.select().from(auditLogsTable).where(eq(auditLogsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Audit log not found" });
  return res.json({ data: serialize(row) });
});

export default router;
