import crypto from "crypto";
import { db } from "@/lib/db";
import {
  commissionSettingsTable,
  userSubscriptionsTable,
  subscriptionPlansTable,
  transactionsTable,
  transactionStatusHistoryTable,
  paymentWebhookEventsTable,
} from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";

export async function calculateCommission(params: {
  amount: number;
  userId?: number;
  overrideType?: "FLAT" | "PERCENTAGE";
  overrideValue?: number;
}) {
  const amount = Number(params.amount);
  if (!(amount > 0)) throw new Error("Amount must be positive");

  const [settings] = await db.select().from(commissionSettingsTable).limit(1);
  let type: "FLAT" | "PERCENTAGE" = (settings?.defaultCommissionType as "FLAT" | "PERCENTAGE") || "PERCENTAGE";
  let rate = Number(settings?.defaultCommissionValue ?? 10);
  let source: "OVERRIDE" | "SUBSCRIPTION" | "DEFAULT" = "DEFAULT";
  const taxRate = Number(settings?.taxRate ?? 18);

  if (params.userId) {
    const now = new Date();
    const [sub] = await db
      .select({
        commissionType: subscriptionPlansTable.commissionType,
        commissionValue: subscriptionPlansTable.commissionValue,
        endDate: userSubscriptionsTable.endDate,
      })
      .from(userSubscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(userSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(and(eq(userSubscriptionsTable.userId, params.userId), eq(userSubscriptionsTable.status, "ACTIVE")))
      .orderBy(desc(userSubscriptionsTable.createdAt))
      .limit(1);
    if (sub && (!sub.endDate || sub.endDate >= now)) {
      type = (sub.commissionType as "FLAT" | "PERCENTAGE") || "PERCENTAGE";
      rate = Number(sub.commissionValue ?? 10);
      source = "SUBSCRIPTION";
    }
  }

  if (params.overrideType != null && params.overrideValue != null) {
    type = params.overrideType;
    rate = Number(params.overrideValue);
    source = "OVERRIDE";
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const commissionAmount = type === "FLAT" ? round2(rate) : round2((amount * rate) / 100);

  return {
    commissionType: type,
    commissionRate: rate,
    commissionAmount,
    taxAmount: round2((amount * taxRate) / 100),
    platformFee: commissionAmount,
    source,
  };
}

export function billingCycleEndDate(start: Date, cycle: string): Date | null {
  if (cycle === "LIFETIME") return null;
  const d = new Date(start);
  if (cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (cycle === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  else if (cycle === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export function generateReceipt(txn: typeof transactionsTable.$inferSelect) {
  return [
    "X!Y — Payment Receipt",
    `Transaction ID: ${txn.id}`,
    `Booking ID: ${txn.bookingId ?? "N/A"}`,
    `Amount: ${txn.currency} ${txn.amount}`,
    `Tax: ${txn.currency} ${txn.taxAmount ?? "0"}`,
    `Commission: ${txn.currency} ${txn.commissionAmount ?? "0"}`,
    `Platform Fee: ${txn.currency} ${txn.platformFee ?? "0"}`,
    `Date: ${txn.transactionDate.toISOString()}`,
    `Reference: ${txn.referenceNumber ?? txn.paymentProviderReference ?? "N/A"}`,
    `Status: ${txn.status}`,
  ].join("\n");
}

export async function recordStatusChange(params: {
  transactionId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy?: number | null;
  notes?: string | null;
  source?: string;
}) {
  await db.insert(transactionStatusHistoryTable).values({
    transactionId: params.transactionId,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    changedBy: params.changedBy ?? null,
    notes: params.notes ?? null,
    source: params.source ?? "SYSTEM",
  });
}

export async function markWebhookProcessed(params: {
  provider: string;
  eventId: string;
  eventType?: string;
  payloadHash?: string;
  transactionId?: number;
}) {
  try {
    await db.insert(paymentWebhookEventsTable).values({
      provider: params.provider,
      eventId: params.eventId,
      eventType: params.eventType ?? null,
      payloadHash: params.payloadHash ?? null,
      transactionId: params.transactionId ?? null,
    });
    return { duplicate: false };
  } catch {
    return { duplicate: true };
  }
}

export function verifyWebhookSignature(payload: string, signature: string | undefined, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function hashPayload(payload: string) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function serializeTxn(t: typeof transactionsTable.$inferSelect) {
  return {
    ...t,
    transactionDate: t.transactionDate.toISOString(),
    webhookProcessedAt: t.webhookProcessedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
