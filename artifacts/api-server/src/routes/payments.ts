import { Router } from "express";
import crypto from "crypto";
import { db, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
} from "../lib/auth";
import { checkoutBody } from "../lib/payment-schemas";
import { calculateCommission } from "../lib/commission-service";
import {
  getPaymentGateway,
  generateReceipt,
  generateInvoice,
  recordStatusChange,
  markWebhookProcessed,
  findTransactionByCheckout,
  hashPayload,
} from "../lib/payment-service";

const router = Router();

function serializeTxn(t: typeof transactionsTable.$inferSelect) {
  return {
    ...t,
    transactionDate: t.transactionDate.toISOString(),
    webhookProcessedAt: t.webhookProcessedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.post("/payments/checkout", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = checkoutBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  let txn: typeof transactionsTable.$inferSelect | undefined;
  if (parsed.data.transactionId) {
    const [existing] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, parsed.data.transactionId))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Transaction not found" });
    if (existing.payerUserId !== user.id && !isAdmin(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (existing.status !== "PENDING") {
      return res.status(409).json({ error: "Transaction is not pending" });
    }
    txn = existing;
  } else {
    const amount = Number(parsed.data.amount);
    if (!(amount > 0)) return res.status(400).json({ error: "amount required when creating checkout" });
    const currency = (parsed.data.currency || "INR").toUpperCase();
    const commission = await calculateCommission({
      amount,
      userId: parsed.data.payeeUserId ?? undefined,
    });
    const [created] = await db
      .insert(transactionsTable)
      .values({
        bookingId: parsed.data.bookingId ?? null,
        payerUserId: user.id,
        payeeUserId: parsed.data.payeeUserId ?? null,
        amount: String(amount),
        platformFee: String(commission.platformFee),
        commissionAmount: String(commission.commissionAmount),
        commissionType: commission.commissionType,
        commissionRate: String(commission.commissionRate),
        taxAmount: String(commission.taxAmount),
        currency,
        status: "PENDING",
        paymentProvider: getPaymentGateway().name,
        transactionDate: new Date(),
      })
      .returning();
    txn = created;
    await recordStatusChange({
      transactionId: txn.id,
      fromStatus: null,
      toStatus: "PENDING",
      changedBy: user.id,
      source: "USER",
    });
    await createNotification({
      userId: user.id,
      eventType: "PAYMENT_INITIATED",
      title: "Payment initiated",
      description: `Checkout started for transaction #${txn.id}.`,
      relatedType: "Transaction",
      relatedId: txn.id,
      category: "PAYMENT",
    });
  }

  const gateway = getPaymentGateway();
  const session = await gateway.createCheckoutSession({
    transactionId: txn.id,
    amount: Number(txn.amount),
    currency: txn.currency,
    successUrl: parsed.data.successUrl,
    cancelUrl: parsed.data.cancelUrl,
  });

  const [updated] = await db
    .update(transactionsTable)
    .set({
      checkoutSessionId: session.sessionId,
      paymentProvider: session.provider,
      paymentProviderReference: session.sessionId,
      updatedAt: new Date(),
    })
    .where(eq(transactionsTable.id, txn.id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "CHECKOUT_CREATED",
    entityType: "Transaction",
    entityId: txn.id,
    metadata: { sessionId: session.sessionId },
    ipAddress: clientIp(req),
  });

  return res.status(201).json({
    transaction: serializeTxn(updated),
    checkout: session,
  });
});

router.post("/payments/webhook", async (req, res) => {
  const gateway = getPaymentGateway();
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
  const signature = req.headers["x-payment-signature"] as string | undefined;
  const rawBody =
    typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body ?? {});

  if (!gateway.verifyWebhookSignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  let payload: unknown;
  try {
    payload = typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const event = gateway.parseWebhookEvent(payload);
  const { duplicate } = await markWebhookProcessed({
    provider: gateway.name,
    eventId: event.eventId,
    eventType: event.eventType,
    payloadHash: hashPayload(rawBody),
    transactionId: event.transactionId,
  });
  if (duplicate) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  let txn: typeof transactionsTable.$inferSelect | null = null;
  if (event.transactionId) {
    const [row] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, event.transactionId))
      .limit(1);
    txn = row ?? null;
  } else if (event.sessionId) {
    txn = await findTransactionByCheckout(event.sessionId);
  }

  if (!txn) {
    await writeAuditLog({
      action: "WEBHOOK_TRANSACTION_NOT_FOUND",
      entityType: "PaymentWebhook",
      metadata: { eventId: event.eventId },
      ipAddress: clientIp(req),
    });
    return res.status(202).json({ ok: true, pending: true });
  }

  if (txn.status === event.status) {
    return res.status(200).json({ ok: true, unchanged: true });
  }

  const receipt = event.status === "PAID" ? generateReceipt(txn) : txn.receiptUrl;
  const invoice = event.status === "PAID" ? generateInvoice(txn) : txn.invoiceUrl;

  const [updated] = await db
    .update(transactionsTable)
    .set({
      status: event.status,
      paymentProviderReference: event.providerReference || txn.paymentProviderReference,
      webhookProcessedAt: new Date(),
      receiptUrl: typeof receipt === "string" && receipt.includes("\n") ? `data:text/plain;base64,${Buffer.from(receipt).toString("base64")}` : txn.receiptUrl,
      invoiceUrl: typeof invoice === "string" && invoice.includes("\n") ? `data:text/plain;base64,${Buffer.from(invoice).toString("base64")}` : txn.invoiceUrl,
      updatedAt: new Date(),
    })
    .where(eq(transactionsTable.id, txn.id))
    .returning();

  await recordStatusChange({
    transactionId: txn.id,
    fromStatus: txn.status,
    toStatus: event.status,
    source: "WEBHOOK",
    notes: event.eventType,
  });

  await writeAuditLog({
    action: "WEBHOOK_PROCESSED",
    entityType: "Transaction",
    entityId: txn.id,
    metadata: { eventId: event.eventId, status: event.status },
    ipAddress: clientIp(req),
  });

  const notifMap: Record<string, string> = {
    PAID: "PAYMENT_SUCCESSFUL",
    FAILED: "PAYMENT_FAILED",
    REFUNDED: "REFUND_COMPLETED",
  };
  if (notifMap[event.status]) {
    await createNotification({
      userId: updated.payerUserId,
      eventType: notifMap[event.status],
      title: `Payment ${event.status.toLowerCase()}`,
      description: `Transaction #${updated.id} updated via payment provider.`,
      relatedType: "Transaction",
      relatedId: updated.id,
      category: "PAYMENT",
    });
  }

  return res.status(200).json({ ok: true, transaction: serializeTxn(updated) });
});

router.get("/payments/:transactionId", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.transactionId, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });
  if (txn.payerUserId !== user.id && txn.payeeUserId !== user.id && !isAdmin(user)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.status(200).json({
    ...serializeTxn(txn),
    receipt: txn.status === "PAID" ? generateReceipt(txn) : null,
    invoice: txn.status === "PAID" ? generateInvoice(txn) : null,
  });
});

router.get("/payments/:transactionId/receipt", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.transactionId, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });
  if (txn.payerUserId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  if (txn.status !== "PAID") return res.status(409).json({ error: "Receipt available only for paid transactions" });

  const receipt = generateReceipt(txn);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${txn.id}.txt"`);
  return res.status(200).send(receipt);
});

/** Dev helper to complete mock checkout + signed webhook */
router.post("/payments/mock-complete", async (req, res) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    return res.status(404).json({ error: "Not found" });
  }
  const transactionId = Number(req.body?.transactionId);
  const status = String(req.body?.status || "PAID").toUpperCase();
  if (!transactionId) return res.status(400).json({ error: "transactionId required" });

  const gateway = getPaymentGateway();
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
  const payload = JSON.stringify({
    eventId: `evt_mock_${crypto.randomBytes(8).toString("hex")}`,
    eventType: "payment.updated",
    transactionId,
    status,
    providerReference: `pay_mock_${transactionId}`,
  });
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  // Inline process similar to webhook for convenience in MVP
  req.headers["x-payment-signature"] = signature;
  req.body = JSON.parse(payload);

  const event = gateway.parseWebhookEvent(req.body);
  const { duplicate } = await markWebhookProcessed({
    provider: gateway.name,
    eventId: event.eventId,
    eventType: event.eventType,
    payloadHash: hashPayload(payload),
    transactionId,
  });
  if (duplicate) return res.status(200).json({ ok: true, duplicate: true });

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId)).limit(1);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });

  const receipt = generateReceipt(txn);
  const invoice = generateInvoice(txn);
  const [updated] = await db
    .update(transactionsTable)
    .set({
      status: event.status,
      paymentProviderReference: event.providerReference || txn.paymentProviderReference,
      webhookProcessedAt: new Date(),
      receiptUrl: `data:text/plain;base64,${Buffer.from(receipt).toString("base64")}`,
      invoiceUrl: `data:text/plain;base64,${Buffer.from(invoice).toString("base64")}`,
      updatedAt: new Date(),
    })
    .where(eq(transactionsTable.id, transactionId))
    .returning();

  await recordStatusChange({
    transactionId,
    fromStatus: txn.status,
    toStatus: event.status,
    source: "WEBHOOK",
  });

  return res.status(200).json({ ok: true, transaction: serializeTxn(updated) });
});

export default router;
