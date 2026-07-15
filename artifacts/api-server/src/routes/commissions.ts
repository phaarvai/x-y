import { Router } from "express";
import { db, transactionsTable, userSubscriptionsTable, subscriptionPlansTable } from "@workspace/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requireUser, isAdmin } from "../lib/auth";
import { calculateCommissionBody } from "../lib/payment-schemas";
import { calculateCommission, ensureCommissionSettings } from "../lib/commission-service";

const router = Router();

router.post("/commissions/calculate", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await ensureCommissionSettings();

  const parsed = calculateCommissionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const result = await calculateCommission({
    amount: Number(parsed.data.amount),
    userId: parsed.data.userId ?? user.id,
    overrideType: parsed.data.overrideType,
    overrideValue: parsed.data.overrideValue != null ? Number(parsed.data.overrideValue) : undefined,
  });

  return res.status(200).json(result);
});

router.get("/commissions/:transactionId", async (req, res) => {
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
    transactionId: txn.id,
    commissionType: txn.commissionType,
    commissionRate: txn.commissionRate,
    commissionAmount: txn.commissionAmount,
    platformFee: txn.platformFee,
    taxAmount: txn.taxAmount,
  });
});

router.get("/admin/reports/revenue", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const paid = await db
    .select({
      totalRevenue: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
      platformFees: sql<string>`coalesce(sum(${transactionsTable.platformFee}::numeric), 0)`,
      commissions: sql<string>`coalesce(sum(${transactionsTable.commissionAmount}::numeric), 0)`,
      taxes: sql<string>`coalesce(sum(${transactionsTable.taxAmount}::numeric), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.status, "PAID"),
        gte(transactionsTable.transactionDate, from),
        lte(transactionsTable.transactionDate, to),
      ),
    );

  const refunds = await db
    .select({
      refundTotal: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.status, "REFUNDED"),
        gte(transactionsTable.transactionDate, from),
        lte(transactionsTable.transactionDate, to),
      ),
    );

  const pending = await db
    .select({
      pendingTotal: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "PENDING"));

  const monthly = await db
    .select({
      month: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
      revenue: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
      commissions: sql<string>`coalesce(sum(${transactionsTable.commissionAmount}::numeric), 0)`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.status, "PAID"),
        gte(transactionsTable.transactionDate, from),
        lte(transactionsTable.transactionDate, to),
      ),
    )
    .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`);

  const bySubscription = await db
    .select({
      planId: subscriptionPlansTable.id,
      planName: subscriptionPlansTable.name,
      revenue: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(userSubscriptionsTable)
    .innerJoin(subscriptionPlansTable, eq(userSubscriptionsTable.planId, subscriptionPlansTable.id))
    .innerJoin(transactionsTable, eq(userSubscriptionsTable.paymentTransactionId, transactionsTable.id))
    .where(eq(transactionsTable.status, "PAID"))
    .groupBy(subscriptionPlansTable.id, subscriptionPlansTable.name);

  const yearly = await db
    .select({
      year: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY')`,
      revenue: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "PAID"))
    .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY')`)
    .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY')`);

  return res.status(200).json({
    from: from.toISOString(),
    to: to.toISOString(),
    totalRevenue: paid[0]?.totalRevenue ?? "0",
    platformFees: paid[0]?.platformFees ?? "0",
    commissionRevenue: paid[0]?.commissions ?? "0",
    taxesCollected: paid[0]?.taxes ?? "0",
    paidCount: paid[0]?.count ?? 0,
    refunds: refunds[0]?.refundTotal ?? "0",
    refundCount: refunds[0]?.count ?? 0,
    pendingPayments: pending[0]?.pendingTotal ?? "0",
    pendingCount: pending[0]?.count ?? 0,
    monthlyRevenue: monthly,
    yearlyRevenue: yearly,
    revenueBySubscription: bySubscription,
    // Category/industry placeholders until booking taxonomy lands
    revenueByCategory: [],
    revenueByIndustry: [],
  });
});

export default router;
