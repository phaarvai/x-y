import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
} from "@/lib/legal-auth";
import { serializeTxn } from "@/lib/payments";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");
    const bookingId = searchParams.get("bookingId");
    const payerUserId = searchParams.get("payerUserId");
    const payeeUserId = searchParams.get("payeeUserId");
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [];
    if (status) conditions.push(eq(transactionsTable.status, status));
    if (bookingId) conditions.push(eq(transactionsTable.bookingId, parseInt(bookingId, 10)));
    if (payerUserId) conditions.push(eq(transactionsTable.payerUserId, parseInt(payerUserId, 10)));
    if (payeeUserId) conditions.push(eq(transactionsTable.payeeUserId, parseInt(payeeUserId, 10)));
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) conditions.push(gte(transactionsTable.transactionDate, d));
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) conditions.push(lte(transactionsTable.transactionDate, d));
    }
    if (q) {
      conditions.push(
        or(
          ilike(transactionsTable.referenceNumber, `%${q}%`),
          ilike(transactionsTable.paymentProviderReference, `%${q}%`),
          ilike(transactionsTable.notes, `%${q}%`),
          sql`${transactionsTable.id}::text ILIKE ${`%${q}%`}`,
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(where)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactionsTable)
      .where(where);

    return NextResponse.json({
      items: rows.map(serializeTxn),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
