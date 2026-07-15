import { Router } from "express";
import {
  db,
  subscriptionPlansTable,
  userSubscriptionsTable,
  transactionsTable,
} from "@workspace/db";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import {
  createPlanBody,
  updatePlanBody,
  purchaseSubscriptionBody,
} from "../lib/payment-schemas";
import { billingCycleEndDate } from "../lib/payment-service";

const router = Router();

function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeSub(s: typeof userSubscriptionsTable.$inferSelect) {
  return {
    ...s,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate?.toISOString() ?? null,
    renewalDate: s.renewalDate?.toISOString() ?? null,
    cancelledAt: s.cancelledAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function expireStaleSubscriptions(userId?: number) {
  const now = new Date();
  const conditions = [
    eq(userSubscriptionsTable.status, "ACTIVE"),
    lt(userSubscriptionsTable.endDate, now),
  ];
  if (userId) conditions.push(eq(userSubscriptionsTable.userId, userId));
  const stale = await db
    .select()
    .from(userSubscriptionsTable)
    .where(and(...conditions));
  for (const sub of stale) {
    await db
      .update(userSubscriptionsTable)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(userSubscriptionsTable.id, sub.id));
    await createNotification({
      userId: sub.userId,
      eventType: "SUBSCRIPTION_EXPIRED",
      title: "Subscription expired",
      description: "Your plan has expired. Access has been downgraded to free defaults.",
      relatedType: "UserSubscription",
      relatedId: sub.id,
      category: "SUBSCRIPTION",
    });
    await writeAuditLog({
      actorUserId: sub.userId,
      action: "SUBSCRIPTION_EXPIRED",
      entityType: "UserSubscription",
      entityId: sub.id,
    });
  }
}

// —— Admin plans ——
router.post("/admin/subscription-plans", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const parsed = createPlanBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const [plan] = await db
    .insert(subscriptionPlansTable)
    .values({
      name: escapeHtml(d.name),
      description: d.description ? escapeHtml(d.description) : null,
      price: String(d.price),
      currency: (d.currency || "INR").toUpperCase(),
      billingCycle: d.billingCycle,
      commissionType: d.commissionType || "PERCENTAGE",
      commissionValue: String(d.commissionValue ?? 10),
      listingLimit: d.listingLimit ?? 10,
      featuredListings: d.featuredListings ?? 0,
      prioritySupport: d.prioritySupport ?? false,
      adCredits: d.adCredits ?? 0,
      storageLimit: d.storageLimit ?? 1024,
      features: d.features ? escapeHtml(d.features) : null,
      status: d.status || "ACTIVE",
      isRecommended: d.isRecommended ?? false,
      sortOrder: d.sortOrder ?? 0,
    })
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "SUBSCRIPTION_PLAN_CREATED",
    entityType: "SubscriptionPlan",
    entityId: plan.id,
    ipAddress: clientIp(req),
  });

  return res.status(201).json(serializePlan(plan));
});

router.get("/admin/subscription-plans", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const rows = await db.select().from(subscriptionPlansTable).orderBy(asc(subscriptionPlansTable.sortOrder));
  return res.status(200).json({ items: rows.map(serializePlan) });
});

router.put("/admin/subscription-plans/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const [updated] = await db
    .update(subscriptionPlansTable)
    .set({
      ...(d.name != null ? { name: escapeHtml(d.name) } : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
      ...(d.price != null ? { price: String(d.price) } : {}),
      ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
      ...(d.billingCycle != null ? { billingCycle: d.billingCycle } : {}),
      ...(d.commissionType != null ? { commissionType: d.commissionType } : {}),
      ...(d.commissionValue != null ? { commissionValue: String(d.commissionValue) } : {}),
      ...(d.listingLimit != null ? { listingLimit: d.listingLimit } : {}),
      ...(d.featuredListings != null ? { featuredListings: d.featuredListings } : {}),
      ...(d.prioritySupport != null ? { prioritySupport: d.prioritySupport } : {}),
      ...(d.adCredits != null ? { adCredits: d.adCredits } : {}),
      ...(d.storageLimit != null ? { storageLimit: d.storageLimit } : {}),
      ...(d.features !== undefined ? { features: d.features ? escapeHtml(d.features) : null } : {}),
      ...(d.status != null ? { status: d.status } : {}),
      ...(d.isRecommended != null ? { isRecommended: d.isRecommended } : {}),
      ...(d.sortOrder != null ? { sortOrder: d.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionPlansTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Plan not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "SUBSCRIPTION_PLAN_UPDATED",
    entityType: "SubscriptionPlan",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serializePlan(updated));
});

router.delete("/admin/subscription-plans/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(subscriptionPlansTable)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(subscriptionPlansTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Plan not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "SUBSCRIPTION_PLAN_ARCHIVED",
    entityType: "SubscriptionPlan",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serializePlan(updated));
});

// —— Public / user ——
router.get("/subscription-plans", async (_req, res) => {
  const rows = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.status, "ACTIVE"))
    .orderBy(asc(subscriptionPlansTable.sortOrder));
  return res.status(200).json({ items: rows.map(serializePlan) });
});

router.post("/subscriptions", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await expireStaleSubscriptions(user.id);

  const parsed = purchaseSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [plan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(and(eq(subscriptionPlansTable.id, parsed.data.planId), eq(subscriptionPlansTable.status, "ACTIVE")))
    .limit(1);
  if (!plan) return res.status(404).json({ error: "Active plan not found" });

  // Cancel previous active
  await db
    .update(userSubscriptionsTable)
    .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userSubscriptionsTable.userId, user.id), eq(userSubscriptionsTable.status, "ACTIVE")));

  const [paymentTxn] = await db
    .insert(transactionsTable)
    .values({
      payerUserId: user.id,
      payeeUserId: null,
      amount: plan.price,
      currency: plan.currency,
      platformFee: "0",
      commissionAmount: "0",
      taxAmount: "0",
      status: "PAID",
      paymentMethod: "SUBSCRIPTION",
      paymentProvider: "internal",
      referenceNumber: `SUB-${user.id}-${Date.now()}`,
      notes: `Subscription purchase: ${plan.name}`,
      transactionDate: new Date(),
    })
    .returning();

  const start = new Date();
  const end = billingCycleEndDate(start, plan.billingCycle);
  const [sub] = await db
    .insert(userSubscriptionsTable)
    .values({
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      startDate: start,
      endDate: end,
      renewalDate: end,
      autoRenew: parsed.data.autoRenew ?? true,
      paymentTransactionId: paymentTxn.id,
    })
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "SUBSCRIPTION_CREATED",
    entityType: "UserSubscription",
    entityId: sub.id,
    metadata: { planId: plan.id },
    ipAddress: clientIp(req),
  });

  await createNotification({
    userId: user.id,
    eventType: "SUBSCRIPTION_ACTIVATED",
    title: "Subscription activated",
    description: `You are now on the ${plan.name} plan.`,
    relatedType: "UserSubscription",
    relatedId: sub.id,
    category: "SUBSCRIPTION",
  });

  return res.status(201).json({
    subscription: serializeSub(sub),
    plan: serializePlan(plan),
    transaction: {
      id: paymentTxn.id,
      amount: paymentTxn.amount,
      currency: paymentTxn.currency,
      status: paymentTxn.status,
    },
  });
});

router.get("/subscriptions/me", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await expireStaleSubscriptions(user.id);

  const history = await db
    .select({
      subscription: userSubscriptionsTable,
      plan: subscriptionPlansTable,
    })
    .from(userSubscriptionsTable)
    .innerJoin(subscriptionPlansTable, eq(userSubscriptionsTable.planId, subscriptionPlansTable.id))
    .where(eq(userSubscriptionsTable.userId, user.id))
    .orderBy(desc(userSubscriptionsTable.createdAt));

  const current = history.find((h: (typeof history)[number]) => h.subscription.status === "ACTIVE") ?? null;
  const expiredBanner = history.some((h: (typeof history)[number]) => h.subscription.status === "EXPIRED");

  return res.status(200).json({
    current: current
      ? { ...serializeSub(current.subscription), plan: serializePlan(current.plan) }
      : null,
    history: history.map((h: (typeof history)[number]) => ({
      ...serializeSub(h.subscription),
      plan: serializePlan(h.plan),
    })),
    expiredBanner,
    downgraded: !current,
  });
});

router.post("/subscriptions/me/cancel", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const [current] = await db
    .select()
    .from(userSubscriptionsTable)
    .where(and(eq(userSubscriptionsTable.userId, user.id), eq(userSubscriptionsTable.status, "ACTIVE")))
    .limit(1);
  if (!current) return res.status(404).json({ error: "No active subscription" });

  const [updated] = await db
    .update(userSubscriptionsTable)
    .set({
      status: "CANCELLED",
      autoRenew: false,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptionsTable.id, current.id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "SUBSCRIPTION_CANCELLED",
    entityType: "UserSubscription",
    entityId: current.id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeSub(updated));
});

export default router;
