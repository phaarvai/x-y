import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { advertisementsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";

const bodySchema = z.object({
  reason: z.string().min(1).max(2000),
});

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

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });

    const reason = escapeHtml(parsed.data.reason);
    const [updated] = await db
      .update(advertisementsTable)
      .set({
        status: "REJECTED",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(advertisementsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "ADVERTISEMENT_REJECTED",
      entityType: "Advertisement",
      entityId: id,
      metadata: { reason },
      ipAddress: clientIp(req),
    });

    await createNotification({
      userId: existing.ownerUserId,
      eventType: "ADVERTISEMENT_REJECTED",
      title: "Advertisement rejected",
      description: reason,
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
