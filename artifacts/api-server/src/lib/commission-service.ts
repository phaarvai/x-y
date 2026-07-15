import {
  db,
  commissionSettingsTable,
  userSubscriptionsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

export type CommissionResult = {
  commissionType: "FLAT" | "PERCENTAGE";
  commissionRate: number;
  commissionAmount: number;
  taxAmount: number;
  platformFee: number;
  source: "OVERRIDE" | "SUBSCRIPTION" | "DEFAULT";
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function getDefaults() {
  const [row] = await db.select().from(commissionSettingsTable).limit(1);
  return {
    type: (row?.defaultCommissionType as "FLAT" | "PERCENTAGE") || "PERCENTAGE",
    value: Number(row?.defaultCommissionValue ?? 10),
    taxRate: Number(row?.taxRate ?? 18),
  };
}

async function getActivePlanCommission(userId?: number) {
  if (!userId) return null;
  const now = new Date();
  const [sub] = await db
    .select({
      commissionType: subscriptionPlansTable.commissionType,
      commissionValue: subscriptionPlansTable.commissionValue,
      endDate: userSubscriptionsTable.endDate,
      status: userSubscriptionsTable.status,
    })
    .from(userSubscriptionsTable)
    .innerJoin(subscriptionPlansTable, eq(userSubscriptionsTable.planId, subscriptionPlansTable.id))
    .where(and(eq(userSubscriptionsTable.userId, userId), eq(userSubscriptionsTable.status, "ACTIVE")))
    .orderBy(desc(userSubscriptionsTable.createdAt))
    .limit(1);

  if (!sub) return null;
  if (sub.endDate && sub.endDate < now) return null;
  return {
    type: (sub.commissionType as "FLAT" | "PERCENTAGE") || "PERCENTAGE",
    value: Number(sub.commissionValue ?? 10),
  };
}

/**
 * Commission = Plan Commission OR Admin Override OR Default Platform Commission
 */
export async function calculateCommission(params: {
  amount: number;
  userId?: number;
  overrideType?: "FLAT" | "PERCENTAGE";
  overrideValue?: number;
}): Promise<CommissionResult> {
  const amount = Number(params.amount);
  if (!(amount > 0)) throw new Error("Amount must be positive");

  const defaults = await getDefaults();
  let type: "FLAT" | "PERCENTAGE" = defaults.type;
  let rate = defaults.value;
  let source: CommissionResult["source"] = "DEFAULT";

  const plan = await getActivePlanCommission(params.userId);
  if (plan) {
    type = plan.type;
    rate = plan.value;
    source = "SUBSCRIPTION";
  }

  if (params.overrideType != null && params.overrideValue != null) {
    type = params.overrideType;
    rate = Number(params.overrideValue);
    source = "OVERRIDE";
  }

  const commissionAmount =
    type === "FLAT" ? round2(rate) : round2((amount * rate) / 100);
  const taxAmount = round2((amount * defaults.taxRate) / 100);
  const platformFee = commissionAmount;

  return {
    commissionType: type,
    commissionRate: rate,
    commissionAmount,
    taxAmount,
    platformFee,
    source,
  };
}

export async function ensureCommissionSettings() {
  const [existing] = await db.select().from(commissionSettingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(commissionSettingsTable)
    .values({
      defaultCommissionType: "PERCENTAGE",
      defaultCommissionValue: "10",
      taxRate: "18",
    })
    .returning();
  return created;
}
