import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputesTable, disputeEvidenceTable, bookingsTable } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const bookingId = searchParams.get("bookingId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

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
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(disputesTable)
      .where(where);

    return NextResponse.json({
      items: rows.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        closedAt: d.closedAt?.toISOString() ?? null,
      })),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
