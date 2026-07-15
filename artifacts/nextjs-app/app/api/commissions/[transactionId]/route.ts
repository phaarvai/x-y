import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
} from "@/lib/legal-auth";
import { serializeTxn } from "@/lib/payments";

export async function GET(req: NextRequest, ctx: { params: Promise<{ transactionId: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const id = parseInt((await ctx.params).transactionId, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (txn.payerUserId !== user.id && txn.payeeUserId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      transactionId: txn.id,
      amount: txn.amount,
      commissionType: txn.commissionType,
      commissionRate: txn.commissionRate,
      commissionAmount: txn.commissionAmount,
      platformFee: txn.platformFee,
      taxAmount: txn.taxAmount,
      currency: txn.currency,
      status: txn.status,
      transaction: serializeTxn(txn),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
