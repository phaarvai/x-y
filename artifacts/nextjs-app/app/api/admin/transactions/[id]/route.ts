import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable, transactionStatusHistoryTable } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
} from "@/lib/legal-auth";
import { serializeTxn } from "@/lib/payments";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    const history = await db
      .select()
      .from(transactionStatusHistoryTable)
      .where(eq(transactionStatusHistoryTable.transactionId, id))
      .orderBy(asc(transactionStatusHistoryTable.createdAt));

    return NextResponse.json({
      ...serializeTxn(txn),
      history: history.map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
