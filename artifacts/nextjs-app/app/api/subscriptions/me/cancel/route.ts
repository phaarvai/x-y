import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSubscriptionsTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  createNotification,
  clientIp,
} from "@/lib/legal-auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const [active] = await db
      .select()
      .from(userSubscriptionsTable)
      .where(
        and(eq(userSubscriptionsTable.userId, user.id), eq(userSubscriptionsTable.status, "ACTIVE")),
      )
      .orderBy(desc(userSubscriptionsTable.createdAt))
      .limit(1);

    if (!active) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    const [updated] = await db
      .update(userSubscriptionsTable)
      .set({
        status: "CANCELLED",
        autoRenew: false,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptionsTable.id, active.id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "SUBSCRIPTION_CANCELLED",
      entityType: "UserSubscription",
      entityId: active.id,
      ipAddress: clientIp(req),
    });

    await createNotification({
      userId: user.id,
      eventType: "SUBSCRIPTION_CANCELLED",
      title: "Subscription cancelled",
      description: "Your active subscription has been cancelled.",
      relatedType: "UserSubscription",
      relatedId: active.id,
      category: "PAYMENT",
    });

    return NextResponse.json({
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate?.toISOString() ?? null,
      renewalDate: updated.renewalDate?.toISOString() ?? null,
      cancelledAt: updated.cancelledAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
