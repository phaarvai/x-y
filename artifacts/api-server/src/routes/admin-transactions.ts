import { Router } from "express";
import {
  db,
  transactionsTable,
  transactionStatusHistoryTable,
} from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import {
  adminStatusBody,
  adminReferenceBody,
  adminCommissionBody,
  TRANSACTION_STATUSES,
} from "../lib/payment-schemas";
import { recordStatusChange } from "../lib/payment-service";
import { logAdminAction, requireAdmin } from "../lib/admin-rbac";

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

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function notifyStatus(txn: typeof transactionsTable.$inferSelect, status: string) {
  const map: Record<string, { event: string; title: string }> = {
    PAID: { event: "PAYMENT_SUCCESSFUL", title: "Payment successful" },
    FAILED: { event: "PAYMENT_FAILED", title: "Payment failed" },
    REFUNDED: { event: "REFUND_COMPLETED", title: "Refund completed" },
    CANCELLED: { event: "PAYMENT_FAILED", title: "Payment cancelled" },
  };
  const info = map[status];
  if (!info) return;
  await createNotification({
    userId: txn.payerUserId,
    eventType: info.event,
    title: info.title,
    description: `Transaction #${txn.id} is now ${status}.`,
    relatedType: "Transaction",
    relatedId: txn.id,
    category: "PAYMENT",
  });
  if (txn.payeeUserId) {
    await createNotification({
      userId: txn.payeeUserId,
      eventType: info.event,
      title: info.title,
      description: `Transaction #${txn.id} is now ${status}.`,
      relatedType: "Transaction",
      relatedId: txn.id,
      category: "PAYMENT",
    });
  }
}

function buildTxnFilters(query: Record<string, unknown>) {
  const conditions = [];
  const status = query.status ? String(query.status) : undefined;
  const bookingId = query.bookingId ? parseInt(String(query.bookingId), 10) : undefined;
  const payerUserId = query.payerUserId ? parseInt(String(query.payerUserId), 10) : undefined;
  const payeeUserId = query.payeeUserId ? parseInt(String(query.payeeUserId), 10) : undefined;
  const q = query.q ? String(query.q) : undefined;
  const from = query.from ? new Date(String(query.from)) : undefined;
  const to = query.to ? new Date(String(query.to)) : undefined;
  const provider = query.paymentProvider ? String(query.paymentProvider) : undefined;
  const minAmount = query.minAmount != null ? Number(query.minAmount) : undefined;
  const maxAmount = query.maxAmount != null ? Number(query.maxAmount) : undefined;

  if (status && (TRANSACTION_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(transactionsTable.status, status));
  }
  if (bookingId && !Number.isNaN(bookingId)) conditions.push(eq(transactionsTable.bookingId, bookingId));
  if (payerUserId && !Number.isNaN(payerUserId)) conditions.push(eq(transactionsTable.payerUserId, payerUserId));
  if (payeeUserId && !Number.isNaN(payeeUserId)) conditions.push(eq(transactionsTable.payeeUserId, payeeUserId));
  if (from && !Number.isNaN(from.getTime())) conditions.push(gte(transactionsTable.transactionDate, from));
  if (to && !Number.isNaN(to.getTime())) conditions.push(lte(transactionsTable.transactionDate, to));
  if (provider) conditions.push(eq(transactionsTable.paymentProvider, provider));
  if (minAmount != null && !Number.isNaN(minAmount)) {
    conditions.push(sql`${transactionsTable.amount}::numeric >= ${minAmount}`);
  }
  if (maxAmount != null && !Number.isNaN(maxAmount)) {
    conditions.push(sql`${transactionsTable.amount}::numeric <= ${maxAmount}`);
  }
  if (q) {
    conditions.push(
      or(
        ilike(transactionsTable.referenceNumber, `%${q}%`),
        ilike(transactionsTable.paymentProviderReference, `%${q}%`),
        sql`${transactionsTable.id}::text = ${q}`,
      )!,
    );
  }
  return conditions;
}

router.get("/admin/transactions/export", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "export");
  if (!admin) return;

  const conditions = buildTxnFilters(req.query as Record<string, unknown>);
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(where)
    .orderBy(desc(transactionsTable.transactionDate))
    .limit(5000);

  await logAdminAction(admin, "TRANSACTIONS_CSV_EXPORT", "Transaction", null, { count: rows.length }, req);

  const header = [
    "Transaction ID",
    "Booking",
    "Request",
    "Payer",
    "Payee",
    "Amount",
    "Platform Fee",
    "Commission",
    "Taxes",
    "Status",
    "Reference",
    "Date",
  ];
  const lines = [
    header.join(","),
    ...rows.map((t) =>
      [
        t.id,
        t.bookingId ?? "",
        t.requestId ?? "",
        t.payerUserId,
        t.payeeUserId ?? "",
        t.amount,
        t.platformFee ?? "",
        t.commissionAmount ?? "",
        t.taxAmount ?? "",
        t.status,
        t.referenceNumber ?? "",
        t.transactionDate.toISOString(),
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="transactions-${Date.now()}.csv"`);
  return res.status(200).send(lines.join("\n"));
});

router.get("/admin/transactions", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "read");
  if (!admin) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const conditions = buildTxnFilters(req.query as Record<string, unknown>);
  const where = conditions.length ? and(...conditions) : undefined;
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

router.get("/admin/transactions/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "read");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });

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

router.patch("/admin/transactions/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "write");
  if (!admin) return;
  if (
    !admin.isSuperAdmin &&
    !admin.adminRoles.includes("FINANCE_ADMIN") &&
    admin.primaryRole !== "PLATFORM_ADMIN"
  ) {
    return res.status(403).json({ error: "Finance Admin permissions required for payment modifications" });
  }

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = z
    .object({
      status: z.string().min(2).max(32).optional(),
      adminNotes: z.string().max(5000).optional(),
      referenceNumber: z.string().max(128).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  if (parsed.data.status && !(TRANSACTION_STATUSES as readonly string[]).includes(parsed.data.status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  const patch: Record<string, unknown> = {
    updatedByAdmin: admin.id,
    updatedAt: new Date(),
  };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) patch.adminNotes = escapeHtml(parsed.data.adminNotes);
  if (parsed.data.referenceNumber !== undefined) patch.referenceNumber = parsed.data.referenceNumber;

  const [updated] = await db
    .update(transactionsTable)
    .set(patch)
    .where(eq(transactionsTable.id, id))
    .returning();

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await recordStatusChange({
      transactionId: id,
      fromStatus: existing.status,
      toStatus: parsed.data.status,
      changedBy: admin.id,
      notes: parsed.data.adminNotes,
      source: "ADMIN",
    });
    await notifyStatus(updated, parsed.data.status);
  }

  await logAdminAction(admin, "TRANSACTION_UPDATED", "Transaction", id, parsed.data, req);
  await createNotification({
    userId: existing.payerUserId,
    eventType: "TRANSACTION_UPDATED",
    title: "Transaction updated",
    description: `Transaction #${id} was updated by an administrator.`,
    relatedType: "Transaction",
    relatedId: id,
    category: "PAYMENT",
  });

  return res.json(serializeTxn(updated));
});

router.patch("/admin/transactions/:id/status", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "write");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = adminStatusBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  const [updated] = await db
    .update(transactionsTable)
    .set({
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes ? escapeHtml(parsed.data.adminNotes) : existing.adminNotes,
      updatedByAdmin: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(transactionsTable.id, id))
    .returning();

  await recordStatusChange({
    transactionId: id,
    fromStatus: existing.status,
    toStatus: parsed.data.status,
    changedBy: admin.id,
    notes: parsed.data.adminNotes,
    source: "ADMIN",
  });

  await writeAuditLog({
    actorUserId: admin.id,
    action: "TRANSACTION_STATUS_UPDATED",
    entityType: "Transaction",
    entityId: id,
    metadata: { from: existing.status, to: parsed.data.status },
    ipAddress: clientIp(req),
  });

  await notifyStatus(updated, parsed.data.status);
  return res.status(200).json(serializeTxn(updated));
});

router.patch("/admin/transactions/:id/reference", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "write");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = adminReferenceBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  try {
    const [updated] = await db
      .update(transactionsTable)
      .set({
        referenceNumber: parsed.data.referenceNumber,
        adminNotes: parsed.data.adminNotes ? escapeHtml(parsed.data.adminNotes) : undefined,
        updatedByAdmin: admin.id,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Transaction not found" });

    await writeAuditLog({
      actorUserId: admin.id,
      action: "TRANSACTION_REFERENCE_UPDATED",
      entityType: "Transaction",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return res.status(200).json(serializeTxn(updated));
  } catch {
    return res.status(409).json({ error: "Reference number already in use" });
  }
});

router.patch("/admin/transactions/:id/commission", async (req, res) => {
  const admin = await requireAdmin(req, res, "transactions", "write");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = adminCommissionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  const rate = Number(parsed.data.commissionRate);
  const amount =
    parsed.data.commissionAmount != null
      ? Number(parsed.data.commissionAmount)
      : parsed.data.commissionType === "FLAT"
        ? rate
        : Math.round(((Number(existing.amount) * rate) / 100) * 100) / 100;

  const [updated] = await db
    .update(transactionsTable)
    .set({
      commissionType: parsed.data.commissionType,
      commissionRate: String(rate),
      commissionAmount: String(amount),
      platformFee: String(amount),
      adminNotes: parsed.data.notes ? escapeHtml(parsed.data.notes) : existing.adminNotes,
      updatedByAdmin: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(transactionsTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: admin.id,
    action: "COMMISSION_OVERRIDDEN",
    entityType: "Transaction",
    entityId: id,
    metadata: { commissionType: parsed.data.commissionType, rate, amount },
    ipAddress: clientIp(req),
  });

  await createNotification({
    userId: existing.payerUserId,
    eventType: "COMMISSION_OVERRIDDEN",
    title: "Commission updated",
    description: `Commission on transaction #${id} was updated by admin.`,
    relatedType: "Transaction",
    relatedId: id,
    category: "PAYMENT",
  });

  return res.status(200).json(serializeTxn(updated));
});

export default router;
