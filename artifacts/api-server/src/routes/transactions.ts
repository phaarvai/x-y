import { Router } from "express";
import {
  db,
  transactionsTable,
  transactionStatusHistoryTable,
} from "@workspace/db";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import {
  createTransactionBody,
  updateTransactionBody,
  TRANSACTION_STATUSES,
} from "../lib/payment-schemas";
import { calculateCommission } from "../lib/commission-service";
import { recordStatusChange } from "../lib/payment-service";

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

function canViewTxn(userId: number, admin: boolean, t: typeof transactionsTable.$inferSelect) {
  return admin || t.payerUserId === userId || t.payeeUserId === userId;
}

router.post("/transactions", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = createTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const amount = Number(d.amount);
  const commission = await calculateCommission({ amount, userId: d.payeeUserId ?? undefined });

  const [txn] = await db
    .insert(transactionsTable)
    .values({
      requestId: d.requestId ?? null,
      bookingId: d.bookingId ?? null,
      payerUserId: user.id,
      payeeUserId: d.payeeUserId ?? null,
      amount: String(amount),
      platformFee: d.platformFee != null ? String(d.platformFee) : String(commission.platformFee),
      commissionAmount: String(commission.commissionAmount),
      commissionType: commission.commissionType,
      commissionRate: String(commission.commissionRate),
      taxAmount: d.taxAmount != null ? String(d.taxAmount) : String(commission.taxAmount),
      currency: d.currency.toUpperCase(),
      paymentMethod: d.paymentMethod ?? null,
      status: "PENDING",
      notes: d.notes ? escapeHtml(d.notes) : null,
      transactionDate: new Date(),
    })
    .returning();

  await recordStatusChange({
    transactionId: txn.id,
    fromStatus: null,
    toStatus: "PENDING",
    changedBy: user.id,
    source: "USER",
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "TRANSACTION_CREATED",
    entityType: "Transaction",
    entityId: txn.id,
    ipAddress: clientIp(req),
  });

  await createNotification({
    userId: user.id,
    eventType: "PAYMENT_INITIATED",
    title: "Payment initiated",
    description: `Transaction #${txn.id} for ${txn.currency} ${txn.amount} is pending.`,
    relatedType: "Transaction",
    relatedId: txn.id,
    category: "PAYMENT",
  });

  return res.status(201).json(serializeTxn(txn));
});

router.get("/transactions", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : undefined;
  const bookingId = req.query.bookingId ? parseInt(String(req.query.bookingId), 10) : undefined;

  const conditions = [
    or(eq(transactionsTable.payerUserId, user.id), eq(transactionsTable.payeeUserId, user.id))!,
  ];
  if (status && (TRANSACTION_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(transactionsTable.status, status));
  }
  if (bookingId && !Number.isNaN(bookingId)) conditions.push(eq(transactionsTable.bookingId, bookingId));

  const where = and(...conditions);
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(where)
    .orderBy(desc(transactionsTable.transactionDate))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactionsTable)
    .where(where);

  return res.status(200).json({ items: rows.map(serializeTxn), total: count, page, limit });
});

router.get("/transactions/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });
  if (!canViewTxn(user.id, isAdmin(user), txn)) return res.status(403).json({ error: "Forbidden" });

  const history = await db
    .select()
    .from(transactionStatusHistoryTable)
    .where(eq(transactionStatusHistoryTable.transactionId, id))
    .orderBy(desc(transactionStatusHistoryTable.createdAt));

  return res.status(200).json({
    ...serializeTxn(txn),
    history: history.map((h: typeof transactionStatusHistoryTable.$inferSelect) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  });
});

router.put("/transactions/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Transaction not found" });
  if (existing.payerUserId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  if (existing.status !== "PENDING") {
    return res.status(409).json({ error: "Only pending transactions can be updated" });
  }

  const parsed = updateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [updated] = await db
    .update(transactionsTable)
    .set({
      ...(parsed.data.notes !== undefined
        ? { notes: parsed.data.notes ? escapeHtml(parsed.data.notes) : null }
        : {}),
      ...(parsed.data.paymentMethod !== undefined ? { paymentMethod: parsed.data.paymentMethod } : {}),
      ...(parsed.data.payeeUserId !== undefined ? { payeeUserId: parsed.data.payeeUserId } : {}),
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

  return res.status(200).json(serializeTxn(updated));
});

export default router;
