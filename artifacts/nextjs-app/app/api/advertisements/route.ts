import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  advertisementAnalyticsTable,
  advertisementsTable,
} from "@/lib/schema";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
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
  title: z.string().min(2).max(255),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  destinationUrl: z.string().url().max(2000),
  placement: z.string().min(1).max(64),
  category: z.string().max(64).optional().nullable(),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
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

async function expireEndedAds() {
  const now = new Date();
  await db
    .update(advertisementsTable)
    .set({ status: "EXPIRED", updatedAt: now })
    .where(
      and(
        or(eq(advertisementsTable.status, "RUNNING"), eq(advertisementsTable.status, "APPROVED"))!,
        lte(advertisementsTable.endDate, now),
      ),
    );
}

export async function GET(req: NextRequest) {
  try {
    await expireEndedAds();

    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "true";
    const active = searchParams.get("active") === "true";
    const placement = searchParams.get("placement");
    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const conditions = [];
    const now = new Date();

    if (mine) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      conditions.push(eq(advertisementsTable.ownerUserId, user.id));
    } else if (active) {
      conditions.push(
        or(eq(advertisementsTable.status, "RUNNING"), eq(advertisementsTable.status, "APPROVED"))!,
      );
      conditions.push(lte(advertisementsTable.startDate, now));
      conditions.push(gte(advertisementsTable.endDate, now));
    } else {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      if (!isAdmin(user)) {
        conditions.push(eq(advertisementsTable.ownerUserId, user.id));
      }
    }

    if (placement) conditions.push(eq(advertisementsTable.placement, placement));
    if (category) conditions.push(eq(advertisementsTable.category, category));

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(advertisementsTable)
      .where(where)
      .orderBy(desc(advertisementsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(advertisementsTable)
      .where(where);

    return NextResponse.json({
      items: rows.map(serializeAd),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const startDate = new Date(d.startDate);
    const endDate = new Date(d.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid startDate/endDate" }, { status: 400 });
    }
    if (endDate <= startDate) {
      return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
    }

    const [ad] = await db
      .insert(advertisementsTable)
      .values({
        ownerUserId: user.id,
        title: escapeHtml(d.title),
        description: d.description ? escapeHtml(d.description) : null,
        imageUrl: d.imageUrl ?? null,
        destinationUrl: d.destinationUrl,
        placement: escapeHtml(d.placement),
        category: d.category ? escapeHtml(d.category) : null,
        status: "PENDING",
        startDate,
        endDate,
        budget: String(d.budget ?? 0),
        remainingCredits: d.remainingCredits ?? 0,
      })
      .returning();

    await db.insert(advertisementAnalyticsTable).values({
      advertisementId: ad.id,
      impressions: 0,
      clicks: 0,
      ctr: "0",
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "ADVERTISEMENT_CREATED",
      entityType: "Advertisement",
      entityId: ad.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeAd(ad), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
