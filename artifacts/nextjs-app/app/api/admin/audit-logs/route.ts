import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogsTable } from "@/lib/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-rbac";

export async function GET(req: NextRequest) {
  if (process.env.FF_AUDIT_API === "false") {
    return NextResponse.json({ error: "Audit API disabled" }, { status: 503 });
  }
  const admin = await requireAdmin(req, "users", "read");
  if (admin instanceof NextResponse) return admin;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 25) || 25));
  const conditions = [];
  const userId = sp.get("userId");
  const entityType = sp.get("entityType");
  const entityId = sp.get("entityId");
  const action = sp.get("action");
  const from = sp.get("from");
  const to = sp.get("to");

  if (userId) conditions.push(eq(auditLogsTable.actorUserId, Number(userId)));
  if (entityType) conditions.push(eq(auditLogsTable.entityType, entityType));
  if (entityId) conditions.push(eq(auditLogsTable.entityId, Number(entityId)));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) conditions.push(gte(auditLogsTable.createdAt, d));
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) conditions.push(lte(auditLogsTable.createdAt, d));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(auditLogsTable)
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
  ]);

  const total = countRow[0]?.count ?? 0;
  return NextResponse.json({
    data: rows.map((row) => ({
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
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  });
}
