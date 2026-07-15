import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketOpportunitiesTable, serviceProviderProfilesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { serOpportunity } from "@/lib/marketplace-owned";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const notes = (body as { notes?: string })?.notes;

    const [updated] = await db
      .update(marketOpportunitiesTable)
      .set({
        status: "PUBLISHED",
        moderationStatus: "APPROVED",
        moderatedBy: user.id,
        moderatedAt: new Date(),
        moderationNotes: notes ? escapeHtml(String(notes)) : null,
        updatedAt: new Date(),
      })
      .where(eq(marketOpportunitiesTable.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [provider] = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, updated.providerId))
      .limit(1);

    if (provider) {
      await createNotification({
        userId: provider.userId,
        eventType: "MARKET_OPPORTUNITY_APPROVED",
        title: "Market opportunity approved",
        description: updated.title,
        relatedType: "MarketOpportunity",
        relatedId: id,
        category: "MARKETPLACE",
      });
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "MARKET_OPPORTUNITY_APPROVED",
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
