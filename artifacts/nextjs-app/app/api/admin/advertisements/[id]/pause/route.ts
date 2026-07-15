import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { advertisementsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
} from "@/lib/legal-auth";

function serializeAd(a: typeof advertisementsTable.$inferSelect) {
  return {
    ...a,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate.toISOString(),
    approvedAt: a.approvedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });
    if (existing.status !== "RUNNING" && existing.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved/running ads can be paused" }, { status: 409 });
    }

    const [updated] = await db
      .update(advertisementsTable)
      .set({ status: "PAUSED", updatedAt: new Date() })
      .where(eq(advertisementsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "ADVERTISEMENT_PAUSED",
      entityType: "Advertisement",
      entityId: id,
      ipAddress: clientIp(req),
    });

    await createNotification({
      userId: existing.ownerUserId,
      eventType: "ADVERTISEMENT_PAUSED",
      title: "Advertisement paused",
      description: `Your ad "${existing.title}" was paused.`,
      relatedType: "Advertisement",
      relatedId: id,
      category: "PAYMENT",
    });

    return NextResponse.json(serializeAd(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
