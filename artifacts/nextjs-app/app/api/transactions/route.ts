import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable, transactionsTable } from "@/lib/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { calculateCommission, recordStatusChange, serializeTxn } from "@/lib/payments";

const createBody = z.object({
  amount: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  currency: z.string().length(3).optional(),
  bookingId: z.number().int().positive().optional().nullable(),
  requestId: z.number().int().positive().optional().nullable(),
  payeeUserId: z.number().int().positive().optional().nullable(),
  paymentMethod: z.string().max(64).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
}).refine((d) => d.amount > 0, { message: "Amount must be positive", path: ["amount"] });

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");
    const bookingId = searchParams.get("bookingId");

    const conditions = [
      or(eq(transactionsTable.payerUserId, user.id), eq(transactionsTable.payeeUserId, user.id))!,
    ];
    if (status) conditions.push(eq(transactionsTable.status, status));
    if (bookingId) conditions.push(eq(transactionsTable.bookingId, parseInt(bookingId, 10)));

    const where = and(...conditions);
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    let payeeUserId = d.payeeUserId ?? null;

    if (d.bookingId) {
      const [booking] = await db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.id, d.bookingId))
        .limit(1);
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      if (booking.visionaryUserId !== user.id && booking.manufacturerUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!payeeUserId) {
        payeeUserId =
          booking.visionaryUserId === user.id
            ? booking.manufacturerUserId
            : booking.visionaryUserId;
      }
    }

    const commission = await calculateCommission({
      amount: d.amount,
      userId: payeeUserId ?? undefined,
    });

    const [txn] = await db
      .insert(transactionsTable)
      .values({
        payerUserId: user.id,
        payeeUserId,
        bookingId: d.bookingId ?? null,
        requestId: d.requestId ?? null,
        amount: String(d.amount),
        currency: (d.currency ?? "INR").toUpperCase(),
        paymentMethod: d.paymentMethod ? escapeHtml(d.paymentMethod) : null,
        notes: d.notes ? escapeHtml(d.notes) : null,
        status: "PENDING",
        commissionType: commission.commissionType,
        commissionRate: String(commission.commissionRate),
        commissionAmount: String(commission.commissionAmount),
        platformFee: String(commission.platformFee),
        taxAmount: String(commission.taxAmount),
      })
      .returning();

    await recordStatusChange({
      transactionId: txn.id,
      fromStatus: null,
      toStatus: "PENDING",
      changedBy: user.id,
      notes: "Transaction created",
      source: "USER",
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "TRANSACTION_CREATED",
      entityType: "Transaction",
      entityId: txn.id,
      metadata: { amount: d.amount, bookingId: d.bookingId ?? null },
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeTxn(txn), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
