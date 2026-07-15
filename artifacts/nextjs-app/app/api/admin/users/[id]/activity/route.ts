import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogsTable, userLoginHistoryTable } from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "users", "read");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(
        or(
          eq(auditLogsTable.actorUserId, id),
          and(eq(auditLogsTable.entityType, "User"), eq(auditLogsTable.entityId, id)),
        )!,
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(100);

    const logins = await db
      .select()
      .from(userLoginHistoryTable)
      .where(eq(userLoginHistoryTable.userId, id))
      .orderBy(desc(userLoginHistoryTable.createdAt))
      .limit(50);

    const timeline = [
      ...logs.map((l) => ({
        type: "audit" as const,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        createdAt: l.createdAt.toISOString(),
        metadata: l.metadata,
      })),
      ...logins.map((l) => ({
        type: "login" as const,
        action: l.success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
        entityType: "Session",
        entityId: null as number | null,
        createdAt: l.createdAt.toISOString(),
        metadata: JSON.stringify({ ip: l.ipAddress }),
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({ items: timeline });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
