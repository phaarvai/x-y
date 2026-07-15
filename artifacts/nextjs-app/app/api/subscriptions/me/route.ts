import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionPlansTable, userSubscriptionsTable } from "@/lib/schema";
import { and, desc, eq, lt } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
} from "@/lib/legal-auth";

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

function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const now = new Date();

    const stale = await db
      .select()
      .from(userSubscriptionsTable)
      .where(
        and(
          eq(userSubscriptionsTable.userId, user.id),
          eq(userSubscriptionsTable.status, "ACTIVE"),
          lt(userSubscriptionsTable.endDate, now),
        ),
      );

    let expiredBanner = false;
    for (const sub of stale) {
      if (sub.endDate) {
        await db
          .update(userSubscriptionsTable)
          .set({ status: "EXPIRED", updatedAt: now })
          .where(eq(userSubscriptionsTable.id, sub.id));
        expiredBanner = true;
      }
    }

    const history = await db
      .select({
        subscription: userSubscriptionsTable,
        plan: subscriptionPlansTable,
      })
      .from(userSubscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(userSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(userSubscriptionsTable.userId, user.id))
      .orderBy(desc(userSubscriptionsTable.createdAt));

    const currentRow = history.find((h) => h.subscription.status === "ACTIVE");
    const current = currentRow
      ? {
          ...serializeSub(currentRow.subscription),
          plan: serializePlan(currentRow.plan),
        }
      : null;

    const previousActive = history.find(
      (h) =>
        h.subscription.status !== "ACTIVE" &&
        (h.subscription.status === "EXPIRED" || h.subscription.status === "CANCELLED"),
    );
    const downgraded =
      !current &&
      !!previousActive &&
      Number(previousActive.plan.price) > 0;

    if (!expiredBanner) {
      expiredBanner = history.some(
        (h) =>
          h.subscription.status === "EXPIRED" &&
          h.subscription.updatedAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
      );
    }

    return NextResponse.json({
      current,
      history: history.map((h) => ({
        ...serializeSub(h.subscription),
        plan: serializePlan(h.plan),
      })),
      expiredBanner,
      downgraded,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
