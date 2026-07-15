import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable, transactionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { calculateCommission, recordStatusChange, serializeTxn } from "@/lib/payments";

const checkoutBody = z.object({
  transactionId: z.number().int().positive().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  currency: z.string().length(3).optional(),
  bookingId: z.number().int().positive().optional().nullable(),
  requestId: z.number().int().positive().optional().nullable(),
  payeeUserId: z.number().int().positive().optional().nullable(),
  paymentMethod: z.string().max(64).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  successPath: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = checkoutBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    let txn = null as typeof transactionsTable.$inferSelect | null;

    if (d.transactionId) {
      const [existing] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, d.transactionId))
        .limit(1);
      if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      if (existing.payerUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "PENDING") {
        return NextResponse.json({ error: "Transaction is not payable" }, { status: 409 });
      }
      txn = existing;
    } else {
      const amount = Number(d.amount);
      if (!(amount > 0)) {
        return NextResponse.json({ error: "amount or transactionId is required" }, { status: 400 });
      }

      let payeeUserId = d.payeeUserId ?? null;
      if (d.bookingId) {
        const [booking] = await db
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.id, d.bookingId))
          .limit(1);
        if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        if (!payeeUserId) {
          payeeUserId =
            booking.visionaryUserId === user.id
              ? booking.manufacturerUserId
              : booking.visionaryUserId;
        }
      }

      const commission = await calculateCommission({
        amount,
        userId: payeeUserId ?? undefined,
      });

      const [created] = await db
        .insert(transactionsTable)
        .values({
          payerUserId: user.id,
          payeeUserId,
          bookingId: d.bookingId ?? null,
          requestId: d.requestId ?? null,
          amount: String(amount),
          currency: (d.currency ?? "INR").toUpperCase(),
          paymentMethod: d.paymentMethod ? escapeHtml(d.paymentMethod) : "CHECKOUT",
          notes: d.notes ? escapeHtml(d.notes) : null,
          status: "PENDING",
          paymentProvider: "MOCK",
          commissionType: commission.commissionType,
          commissionRate: String(commission.commissionRate),
          commissionAmount: String(commission.commissionAmount),
          platformFee: String(commission.platformFee),
          taxAmount: String(commission.taxAmount),
        })
        .returning();

      await recordStatusChange({
        transactionId: created.id,
        fromStatus: null,
        toStatus: "PENDING",
        changedBy: user.id,
        notes: "Checkout initiated",
        source: "CHECKOUT",
      });
      txn = created;
    }

    const sessionId = `cs_mock_${crypto.randomBytes(12).toString("hex")}`;
    const origin = new URL(req.url).origin;
    const successPath = d.successPath || `/payments/success?transactionId=${txn.id}`;
    const checkoutUrl = `${origin}${successPath.startsWith("/") ? successPath : `/${successPath}`}${
      successPath.includes("transactionId=") ? "" : `${successPath.includes("?") ? "&" : "?"}transactionId=${txn.id}`
    }`;

    const [updated] = await db
      .update(transactionsTable)
      .set({
        checkoutSessionId: sessionId,
        paymentProvider: txn.paymentProvider || "MOCK",
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, txn.id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "CHECKOUT_SESSION_CREATED",
      entityType: "Transaction",
      entityId: txn.id,
      metadata: { sessionId },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      transaction: serializeTxn(updated),
      sessionId,
      checkoutUrl,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
