import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { disputesTable, auditLogsTable } from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

function serialize(d: typeof disputesTable.$inferSelect, assignedAdminId?: number | null) {
  return {
    ...d,
    assignedAdminId: assignedAdminId ?? null,
    closedAt: d.closedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

async function loadAssignments(disputeIds: number[]) {
  const map = new Map<number, number>();
  if (disputeIds.length === 0) return map;

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(and(eq(auditLogsTable.entityType, "Dispute"), eq(auditLogsTable.action, "DISPUTE_ASSIGNED")))
    .orderBy(desc(auditLogsTable.createdAt));

  for (const log of logs) {
    if (log.entityId == null || map.has(log.entityId)) continue;
    try {
      const meta = JSON.parse(log.metadata || "{}") as { assignedAdminId?: number };
      if (meta.assignedAdminId) map.set(log.entityId, meta.assignedAdminId);
    } catch {
      /* ignore */
    }
  }
  return map;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "disputes", "read");
    if (!isAdminContext(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");

    const conditions = [];
    if (status) conditions.push(eq(disputesTable.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(disputesTable)
      .where(where)
      .orderBy(desc(disputesTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(disputesTable)
      .where(where);

    const assignments = await loadAssignments(rows.map((r) => r.id));

    return NextResponse.json({
      items: rows.map((r) => serialize(r, assignments.get(r.id))),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
