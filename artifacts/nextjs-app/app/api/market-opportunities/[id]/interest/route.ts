import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  marketOpportunitiesTable,
  marketInterestRequestsTable,
  serviceProviderProfilesTable,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { interestBody } from "@/lib/marketplace-constants";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const parsed = interestBody.safeParse(body ?? {});
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [opp] = await db
      .select()
      .from(marketOpportunitiesTable)
      .where(eq(marketOpportunitiesTable.id, id))
      .limit(1);
    if (!opp || opp.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Opportunity not available" }, { status: 404 });
    }

    try {
      const [interest] = await db
        .insert(marketInterestRequestsTable)
        .values({
          opportunityId: id,
          userId: user.id,
          message: parsed.data.message ? escapeHtml(parsed.data.message) : null,
          status: "PENDING",
        })
        .returning();

      const [provider] = await db
        .select()
        .from(serviceProviderProfilesTable)
        .where(eq(serviceProviderProfilesTable.id, opp.providerId))
        .limit(1);

      if (provider) {
        await createNotification({
          userId: provider.userId,
          eventType: "INTEREST_EXPRESSED",
          title: "Interest in market opportunity",
          description: opp.title,
          relatedType: "MarketInterestRequest",
          relatedId: interest.id,
          category: "MARKETPLACE",
        });
      }

      await writeAuditLog({
        actorUserId: user.id,
        action: "MARKET_INTEREST_SUBMITTED",
        entityType: "MarketInterestRequest",
        entityId: interest.id,
        ipAddress: clientIp(req),
      });

      return NextResponse.json(
        {
          ...interest,
          createdAt: interest.createdAt.toISOString(),
          updatedAt: interest.updatedAt.toISOString(),
        },
        { status: 201 },
      );
    } catch {
      return NextResponse.json({ error: "Interest already submitted" }, { status: 409 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
