import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable, transactionStatusHistoryTable } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { serializeTxn } from "@/lib/payments";

const updateBody = z.object({
  notes: z.string().max(5000).optional().nullable(),
  paymentMethod: z.string().max(64).optional().nullable(),
});

function serializeHistory(h: typeof transactionStatusHistoryTable.$inferSelect) {
  return {
    ...h,
    createdAt: h.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (txn.payerUserId !== user.id && txn.payeeUserId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const history = await db
      .select()
      .from(transactionStatusHistoryTable)
      .where(eq(transactionStatusHistoryTable.transactionId, id))
      .orderBy(asc(transactionStatusHistoryTable.createdAt));

    return NextResponse.json({
      ...serializeTxn(txn),
      history: history.map(serializeHistory),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (existing.payerUserId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Only PENDING transactions can be updated" }, { status: 409 });
    }

    const d = parsed.data;
    const [updated] = await db
      .update(transactionsTable)
      .set({
        notes: d.notes !== undefined ? (d.notes ? escapeHtml(d.notes) : null) : existing.notes,
        paymentMethod:
          d.paymentMethod !== undefined
            ? d.paymentMethod
              ? escapeHtml(d.paymentMethod)
              : null
            : existing.paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "TRANSACTION_UPDATED",
      entityType: "Transaction",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeTxn(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
