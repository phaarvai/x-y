import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  subscriptionPlansTable,
  transactionsTable,
  userSubscriptionsTable,
} from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  createNotification,
  clientIp,
} from "@/lib/legal-auth";
import {
  billingCycleEndDate,
  calculateCommission,
  recordStatusChange,
  serializeTxn,
} from "@/lib/payments";

const purchaseBody = z.object({
  planId: z.number().int().positive(),
  autoRenew: z.boolean().optional(),
});

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

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = purchaseBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(
        and(
          eq(subscriptionPlansTable.id, parsed.data.planId),
          eq(subscriptionPlansTable.status, "ACTIVE"),
        ),
      )
      .limit(1);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const amount = Number(plan.price);
    const commission = await calculateCommission({ amount, userId: user.id });

    const [txn] = await db
      .insert(transactionsTable)
      .values({
        payerUserId: user.id,
        payeeUserId: null,
        amount: String(amount),
        currency: plan.currency,
        paymentMethod: "SUBSCRIPTION",
        paymentProvider: "MOCK",
        status: "PAID",
        notes: `Subscription purchase: ${plan.name}`,
        commissionType: commission.commissionType,
        commissionRate: String(commission.commissionRate),
        commissionAmount: String(0),
        platformFee: String(amount),
        taxAmount: String(commission.taxAmount),
        receiptUrl: null,
        paymentProviderReference: `sub_${plan.id}_${Date.now()}`,
      })
      .returning();

    await db
      .update(transactionsTable)
      .set({ receiptUrl: `/api/payments/${txn.id}/receipt`, updatedAt: new Date() })
      .where(eq(transactionsTable.id, txn.id));

    await recordStatusChange({
      transactionId: txn.id,
      fromStatus: null,
      toStatus: "PAID",
      changedBy: user.id,
      notes: "Subscription purchase",
      source: "SUBSCRIPTION",
    });

    const activeSubs = await db
      .select()
      .from(userSubscriptionsTable)
      .where(
        and(eq(userSubscriptionsTable.userId, user.id), eq(userSubscriptionsTable.status, "ACTIVE")),
      );

    for (const sub of activeSubs) {
      await db
        .update(userSubscriptionsTable)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          autoRenew: false,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptionsTable.id, sub.id));
    }

    const start = new Date();
    const end = billingCycleEndDate(start, plan.billingCycle);
    const autoRenew = parsed.data.autoRenew ?? true;

    const [subscription] = await db
      .insert(userSubscriptionsTable)
      .values({
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        startDate: start,
        endDate: end,
        renewalDate: autoRenew ? end : null,
        autoRenew: plan.billingCycle === "LIFETIME" ? false : autoRenew,
        paymentTransactionId: txn.id,
      })
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "SUBSCRIPTION_PURCHASED",
      entityType: "UserSubscription",
      entityId: subscription.id,
      metadata: { planId: plan.id, transactionId: txn.id },
      ipAddress: clientIp(req),
    });

    await createNotification({
      userId: user.id,
      eventType: "SUBSCRIPTION_ACTIVATED",
      title: "Subscription activated",
      description: `Your ${plan.name} subscription is now active.`,
      relatedType: "UserSubscription",
      relatedId: subscription.id,
      category: "PAYMENT",
    });

    const [paidTxn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txn.id)).limit(1);

    return NextResponse.json(
      {
        subscription: serializeSub(subscription),
        plan: {
          ...plan,
          createdAt: plan.createdAt.toISOString(),
          updatedAt: plan.updatedAt.toISOString(),
        },
        transaction: serializeTxn(paidTxn),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
