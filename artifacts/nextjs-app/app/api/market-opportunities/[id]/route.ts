import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketOpportunitiesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { marketOpportunityBody } from "@/lib/marketplace-constants";
import { getOwnedProvider, serOpportunity } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db
      .select()
      .from(marketOpportunitiesTable)
      .where(eq(marketOpportunitiesTable.id, id))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (row.status !== "PUBLISHED") {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      const provider = await getOwnedProvider(user.id, "MARKET_LEAD", isAdmin(user));
      if ((!provider || provider.id !== row.providerId) && !isAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(serOpportunity(row));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db
      .select()
      .from(marketOpportunitiesTable)
      .where(eq(marketOpportunitiesTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const provider = await getOwnedProvider(user.id, "MARKET_LEAD", isAdmin(user));
    if ((!provider || provider.id !== existing.providerId) && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = marketOpportunityBody.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const d = parsed.data;

    const [updated] = await db
      .update(marketOpportunitiesTable)
      .set({
        ...(d.title != null ? { title: escapeHtml(d.title) } : {}),
        ...(d.productCategory != null ? { productCategory: d.productCategory } : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        ...(d.demandVolume !== undefined
          ? { demandVolume: d.demandVolume != null ? String(d.demandVolume) : null }
          : {}),
        ...(d.unit !== undefined ? { unit: d.unit } : {}),
        ...(d.geography !== undefined ? { geography: d.geography } : {}),
        ...(d.timeline !== undefined ? { timeline: d.timeline } : {}),
        ...(d.targetPrice !== undefined
          ? { targetPrice: d.targetPrice != null ? String(d.targetPrice) : null }
          : {}),
        ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
        ...(d.contactRules !== undefined
          ? { contactRules: d.contactRules ? escapeHtml(d.contactRules) : null }
          : {}),
        moderationStatus: "PENDING",
        status: "PENDING_REVIEW",
        updatedAt: new Date(),
      })
      .where(eq(marketOpportunitiesTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "MARKET_OPPORTUNITY_UPDATED",
      entityType: "MarketOpportunity",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serOpportunity(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db
      .select()
      .from(marketOpportunitiesTable)
      .where(eq(marketOpportunitiesTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const provider = await getOwnedProvider(user.id, "MARKET_LEAD", isAdmin(user));
    if ((!provider || provider.id !== existing.providerId) && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(marketOpportunitiesTable)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(eq(marketOpportunitiesTable.id, id));

    await writeAuditLog({
      actorUserId: user.id,
      action: "MARKET_OPPORTUNITY_DELETED",
      entityType: "MarketOpportunity",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ message: "Closed" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
