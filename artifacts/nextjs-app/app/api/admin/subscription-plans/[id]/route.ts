import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionPlansTable } from "@/lib/schema";
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
  name: z.string().min(2).max(128).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.union([z.number(), z.string()]).optional(),
  currency: z.string().length(3).optional(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "LIFETIME"]).optional(),
  commissionType: z.enum(["FLAT", "PERCENTAGE"]).optional(),
  commissionValue: z.union([z.number(), z.string()]).optional(),
  listingLimit: z.number().int().optional().nullable(),
  featuredListings: z.number().int().optional().nullable(),
  prioritySupport: z.boolean().optional(),
  adCredits: z.number().int().optional(),
  storageLimit: z.number().int().optional().nullable(),
  features: z.string().max(10000).optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]).optional(),
  isRecommended: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const d = parsed.data;
    const [updated] = await db
      .update(subscriptionPlansTable)
      .set({
        ...(d.name !== undefined ? { name: escapeHtml(d.name) } : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        ...(d.price !== undefined ? { price: String(Number(d.price)) } : {}),
        ...(d.currency !== undefined ? { currency: d.currency.toUpperCase() } : {}),
        ...(d.billingCycle !== undefined ? { billingCycle: d.billingCycle } : {}),
        ...(d.commissionType !== undefined ? { commissionType: d.commissionType } : {}),
        ...(d.commissionValue !== undefined ? { commissionValue: String(d.commissionValue) } : {}),
        ...(d.listingLimit !== undefined ? { listingLimit: d.listingLimit } : {}),
        ...(d.featuredListings !== undefined ? { featuredListings: d.featuredListings } : {}),
        ...(d.prioritySupport !== undefined ? { prioritySupport: d.prioritySupport } : {}),
        ...(d.adCredits !== undefined ? { adCredits: d.adCredits } : {}),
        ...(d.storageLimit !== undefined ? { storageLimit: d.storageLimit } : {}),
        ...(d.features !== undefined ? { features: d.features ? escapeHtml(d.features) : null } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.isRecommended !== undefined ? { isRecommended: d.isRecommended } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "SUBSCRIPTION_PLAN_UPDATED",
      entityType: "SubscriptionPlan",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializePlan(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const [updated] = await db
      .update(subscriptionPlansTable)
      .set({ status: "ARCHIVED", updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "SUBSCRIPTION_PLAN_ARCHIVED",
      entityType: "SubscriptionPlan",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializePlan(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
