import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  advertisementAnalyticsTable,
  advertisementsTable,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";

const updateBody = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  destinationUrl: z.string().url().max(2000).optional(),
  placement: z.string().min(1).max(64).optional(),
  category: z.string().max(64).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.union([z.number(), z.string()]).optional(),
  remainingCredits: z.number().int().optional(),
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [ad] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
    if (!ad) return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });

    const isPublic = ad.status === "RUNNING" || ad.status === "APPROVED";
    if (!isPublic) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      if (ad.ownerUserId !== user.id && !isAdmin(user)) {
        return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });
      }
    }

    const [analytics] = await db
      .select()
      .from(advertisementAnalyticsTable)
      .where(eq(advertisementAnalyticsTable.advertisementId, id))
      .limit(1);

    return NextResponse.json({
      ...serializeAd(ad),
      analytics: analytics
        ? {
            ...analytics,
            lastViewedAt: analytics.lastViewedAt?.toISOString() ?? null,
            lastClickedAt: analytics.lastClickedAt?.toISOString() ?? null,
            createdAt: analytics.createdAt.toISOString(),
            updatedAt: analytics.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });
    if (existing.ownerUserId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const startDate = d.startDate ? new Date(d.startDate) : undefined;
    const endDate = d.endDate ? new Date(d.endDate) : undefined;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
    }

    const [updated] = await db
      .update(advertisementsTable)
      .set({
        ...(d.title !== undefined ? { title: escapeHtml(d.title) } : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        ...(d.imageUrl !== undefined ? { imageUrl: d.imageUrl } : {}),
        ...(d.destinationUrl !== undefined ? { destinationUrl: d.destinationUrl } : {}),
        ...(d.placement !== undefined ? { placement: escapeHtml(d.placement) } : {}),
        ...(d.category !== undefined ? { category: d.category ? escapeHtml(d.category) : null } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(d.budget !== undefined ? { budget: String(d.budget) } : {}),
        ...(d.remainingCredits !== undefined ? { remainingCredits: d.remainingCredits } : {}),
        updatedAt: new Date(),
        ...(existing.status === "REJECTED" || existing.status === "APPROVED"
          ? { status: "PENDING", rejectionReason: null }
          : {}),
      })
      .where(eq(advertisementsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "ADVERTISEMENT_UPDATED",
      entityType: "Advertisement",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeAd(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });
    if (existing.ownerUserId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updated] = await db
      .update(advertisementsTable)
      .set({ status: "EXPIRED", updatedAt: new Date() })
      .where(eq(advertisementsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "ADVERTISEMENT_SOFT_DELETED",
      entityType: "Advertisement",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeAd(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
