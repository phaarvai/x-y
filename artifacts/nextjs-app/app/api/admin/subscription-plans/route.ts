import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionPlansTable } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";

const createBody = z.object({
  name: z.string().min(2).max(128),
  description: z.string().max(5000).optional().nullable(),
  price: z.union([z.number(), z.string()]).transform((v) => Number(v)),
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
}).refine((d) => d.price >= 0, { message: "Price must be non-negative", path: ["price"] });

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
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const rows = await db
      .select()
      .from(subscriptionPlansTable)
      .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.id));

    return NextResponse.json({ items: rows.map(serializePlan) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const [plan] = await db
      .insert(subscriptionPlansTable)
      .values({
        name: escapeHtml(d.name),
        description: d.description ? escapeHtml(d.description) : null,
        price: String(d.price),
        currency: (d.currency ?? "INR").toUpperCase(),
        billingCycle: d.billingCycle ?? "MONTHLY",
        commissionType: d.commissionType ?? "PERCENTAGE",
        commissionValue: String(d.commissionValue ?? 10),
        listingLimit: d.listingLimit ?? 10,
        featuredListings: d.featuredListings ?? 0,
        prioritySupport: d.prioritySupport ?? false,
        adCredits: d.adCredits ?? 0,
        storageLimit: d.storageLimit ?? 1024,
        features: d.features ? escapeHtml(d.features) : null,
        status: d.status ?? "ACTIVE",
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

    return NextResponse.json(serializePlan(plan), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
