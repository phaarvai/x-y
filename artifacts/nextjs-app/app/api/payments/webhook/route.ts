import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import {
  generateReceipt,
  hashPayload,
  markWebhookProcessed,
  recordStatusChange,
  serializeTxn,
  verifyWebhookSignature,
} from "@/lib/payments";

const webhookBody = z.object({
  eventId: z.string().min(1).max(255),
  eventType: z.string().max(128).optional(),
  transactionId: z.number().int().positive(),
  status: z.enum(["PAID", "FAILED", "REFUNDED", "CANCELLED"]),
  provider: z.string().max(64).optional(),
  paymentProviderReference: z.string().max(255).optional().nullable(),
  referenceNumber: z.string().max(128).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
    const signature = req.headers.get("x-payment-signature") || undefined;

    if (!verifyWebhookSignature(raw, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = webhookBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const provider = d.provider || "MOCK";
    const payloadHash = hashPayload(raw);

    const { duplicate } = await markWebhookProcessed({
      provider,
      eventId: d.eventId,
      eventType: d.eventType,
      payloadHash,
      transactionId: d.transactionId,
    });

    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const [existing] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, d.transactionId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const receiptUrl =
      d.status === "PAID" ? `/api/payments/${existing.id}/receipt` : existing.receiptUrl;

    const [updated] = await db
      .update(transactionsTable)
      .set({
        status: d.status,
        paymentProviderReference: d.paymentProviderReference
          ? escapeHtml(d.paymentProviderReference)
          : existing.paymentProviderReference,
        referenceNumber: d.referenceNumber
          ? escapeHtml(d.referenceNumber)
          : existing.referenceNumber,
        receiptUrl,
        webhookProcessedAt: new Date(),
        paymentProvider: provider,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, existing.id))
      .returning();

    if (existing.status !== d.status) {
      await recordStatusChange({
        transactionId: existing.id,
        fromStatus: existing.status,
        toStatus: d.status,
        notes: `Webhook ${d.eventType || d.eventId}`,
        source: "WEBHOOK",
      });
    }

    await writeAuditLog({
      action: "PAYMENT_WEBHOOK_PROCESSED",
      entityType: "Transaction",
      entityId: existing.id,
      metadata: { eventId: d.eventId, status: d.status, provider },
      ipAddress: clientIp(req),
    });

    if (d.status === "PAID") {
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
      ok: true,
      duplicate: false,
      transaction: serializeTxn(updated),
      receipt: d.status === "PAID" ? generateReceipt(updated) : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
