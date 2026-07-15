import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
} from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status") || "PAID";

    const conditions = [eq(transactionsTable.status, status)];
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) conditions.push(gte(transactionsTable.transactionDate, d));
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) conditions.push(lte(transactionsTable.transactionDate, d));
    }
    const where = and(...conditions);

    const [totals] = await db
      .select({
        transactionCount: sql<number>`count(*)::int`,
        grossVolume: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
        commissionTotal: sql<string>`coalesce(sum(${transactionsTable.commissionAmount}::numeric), 0)`,
        platformFeeTotal: sql<string>`coalesce(sum(${transactionsTable.platformFee}::numeric), 0)`,
        taxTotal: sql<string>`coalesce(sum(${transactionsTable.taxAmount}::numeric), 0)`,
      })
      .from(transactionsTable)
      .where(where);

    const byDay = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${transactionsTable.transactionDate}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
        volume: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
        commission: sql<string>`coalesce(sum(${transactionsTable.commissionAmount}::numeric), 0)`,
        platformFee: sql<string>`coalesce(sum(${transactionsTable.platformFee}::numeric), 0)`,
      })
      .from(transactionsTable)
      .where(where)
      .groupBy(sql`date_trunc('day', ${transactionsTable.transactionDate})`)
      .orderBy(sql`date_trunc('day', ${transactionsTable.transactionDate})`);

    const byMethod = await db
      .select({
        paymentMethod: sql<string>`coalesce(${transactionsTable.paymentMethod}, 'UNKNOWN')`,
        count: sql<number>`count(*)::int`,
        volume: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
      })
      .from(transactionsTable)
      .where(where)
      .groupBy(sql`coalesce(${transactionsTable.paymentMethod}, 'UNKNOWN')`);

    return NextResponse.json({
      filters: { from, to, status },
      totals,
      byDay,
      byMethod,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
