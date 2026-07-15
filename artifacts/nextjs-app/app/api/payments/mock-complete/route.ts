import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
} from "@/lib/legal-auth";
import { generateReceipt, recordStatusChange, serializeTxn } from "@/lib/payments";

const bodySchema = z.object({
  transactionId: z.number().int().positive(),
  status: z.enum(["PAID", "FAILED", "CANCELLED"]).optional(),
});

/** MVP helper to complete a mock checkout without a real PSP. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const nextStatus = parsed.data.status ?? "PAID";
    const [existing] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, parsed.data.transactionId))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (existing.payerUserId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status !== "PENDING" && existing.status !== "FAILED") {
      return NextResponse.json({ error: "Transaction cannot be completed in current status" }, { status: 409 });
    }

    const receiptUrl =
      nextStatus === "PAID" ? `/api/payments/${existing.id}/receipt` : existing.receiptUrl;

    const [updated] = await db
      .update(transactionsTable)
      .set({
        status: nextStatus,
        paymentProvider: existing.paymentProvider || "MOCK",
        paymentProviderReference: existing.paymentProviderReference || `mock_${existing.id}_${Date.now()}`,
        receiptUrl,
        webhookProcessedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, existing.id))
      .returning();

    await recordStatusChange({
      transactionId: existing.id,
      fromStatus: existing.status,
      toStatus: nextStatus,
      changedBy: user.id,
      notes: "Mock checkout completion",
      source: "MOCK",
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "PAYMENT_MOCK_COMPLETED",
      entityType: "Transaction",
      entityId: existing.id,
      metadata: { status: nextStatus },
      ipAddress: clientIp(req),
    });

    if (nextStatus === "PAID") {
      for (const uid of [existing.payerUserId, existing.payeeUserId]) {
        if (!uid) continue;
        await createNotification({
          userId: uid,
          eventType: "PAYMENT_COMPLETED",
          title: "Payment completed",
          description: `Transaction #${existing.id} was marked PAID.`,
          relatedType: "Transaction",
          relatedId: existing.id,
          category: "PAYMENT",
        });
      }
    }

    return NextResponse.json({
      transaction: serializeTxn(updated),
      receipt: nextStatus === "PAID" ? generateReceipt(updated) : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
