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
  escapeHtml,
} from "@/lib/legal-auth";
import { generateReceipt, recordStatusChange, serializeTxn } from "@/lib/payments";

const statusBody = z.object({
  status: z.enum(["PAID", "FAILED", "REFUNDED", "CANCELLED"]),
  adminNotes: z.string().max(5000).optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = statusBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    const nextStatus = parsed.data.status;
    if (existing.status === nextStatus) {
      return NextResponse.json(serializeTxn(existing));
    }

    const receiptUrl =
      nextStatus === "PAID" ? `/api/payments/${id}/receipt` : existing.receiptUrl;

    const [updated] = await db
      .update(transactionsTable)
      .set({
        status: nextStatus,
        adminNotes:
          parsed.data.adminNotes != null
            ? escapeHtml(parsed.data.adminNotes)
            : existing.adminNotes,
        updatedByAdmin: user.id,
        receiptUrl,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, id))
      .returning();

    await recordStatusChange({
      transactionId: id,
      fromStatus: existing.status,
      toStatus: nextStatus,
      changedBy: user.id,
      notes: parsed.data.adminNotes ? escapeHtml(parsed.data.adminNotes) : null,
      source: "ADMIN",
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "TRANSACTION_STATUS_UPDATED",
      entityType: "Transaction",
      entityId: id,
      metadata: { from: existing.status, to: nextStatus },
      ipAddress: clientIp(req),
    });

    for (const uid of [existing.payerUserId, existing.payeeUserId]) {
      if (!uid) continue;
      await createNotification({
        userId: uid,
        eventType: "PAYMENT_STATUS_UPDATED",
        title: "Payment status updated",
        description: `Transaction #${id} is now ${nextStatus}.`,
        relatedType: "Transaction",
        relatedId: id,
        category: "PAYMENT",
      });
    }

    return NextResponse.json({
      ...serializeTxn(updated),
      receiptPreview: nextStatus === "PAID" ? generateReceipt(updated) : undefined,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
