import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketOpportunitiesTable } from "@/lib/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { marketOpportunityBody } from "@/lib/marketplace-constants";
import { parsePageLimit } from "@/lib/marketplace-helpers";
import { getOwnedProvider, serOpportunity } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);
    const mine = searchParams.get("mine") === "true";
    const conditions = [];

    if (mine) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      const provider = await getOwnedProvider(user.id, "MARKET_LEAD", isAdmin(user));
      if (!provider) return NextResponse.json({ items: [], total: 0, page, limit });
      conditions.push(eq(marketOpportunitiesTable.providerId, provider.id));
    } else {
      conditions.push(eq(marketOpportunitiesTable.status, "PUBLISHED"));
      conditions.push(eq(marketOpportunitiesTable.moderationStatus, "APPROVED"));
    }

    if (searchParams.get("category")) {
      conditions.push(ilike(marketOpportunitiesTable.productCategory, `%${searchParams.get("category")}%`));
    }
    if (searchParams.get("geography")) {
      conditions.push(ilike(marketOpportunitiesTable.geography, `%${searchParams.get("geography")}%`));
    }
    if (searchParams.get("q")) {
      conditions.push(ilike(marketOpportunitiesTable.title, `%${searchParams.get("q")}%`));
    }

    const where = and(...conditions);
    const rows = await db
      .select()
      .from(marketOpportunitiesTable)
      .where(where)
      .orderBy(desc(marketOpportunitiesTable.updatedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketOpportunitiesTable)
      .where(where);

    return NextResponse.json({
      items: rows.map(serOpportunity),
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
    const provider = await getOwnedProvider(user.id, "MARKET_LEAD", isAdmin(user));
    if (!provider) return NextResponse.json({ error: "Market lead profile required" }, { status: 403 });

    const body = await req.json();
    const parsed = marketOpportunityBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    const [row] = await db
      .insert(marketOpportunitiesTable)
      .values({
        providerId: provider.id,
        title: escapeHtml(d.title),
        productCategory: d.productCategory,
        description: d.description ? escapeHtml(d.description) : null,
        demandVolume: d.demandVolume != null ? String(d.demandVolume) : null,
        unit: d.unit ?? null,
        geography: d.geography ?? null,
        timeline: d.timeline ?? null,
        targetPrice: d.targetPrice != null ? String(d.targetPrice) : null,
        currency: (d.currency || "INR").toUpperCase(),
        contactRules: d.contactRules ? escapeHtml(d.contactRules) : null,
        status: "PENDING_REVIEW",
        moderationStatus: "PENDING",
      })
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "MARKET_OPPORTUNITY_CREATED",
      entityType: "MarketOpportunity",
      entityId: row.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serOpportunity(row), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
