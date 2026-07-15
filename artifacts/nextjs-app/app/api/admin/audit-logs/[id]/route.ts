import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  if (process.env.FF_AUDIT_API === "false") {
    return NextResponse.json({ error: "Audit API disabled" }, { status: 503 });
  }
  const admin = await requireAdmin(req, "users", "read");
  if (admin instanceof NextResponse) return admin;

  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [row] = await db.select().from(auditLogsTable).where(eq(auditLogsTable.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    data: {
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
    },
  });
}
