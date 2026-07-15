import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logisticsQuotesTable } from "@/lib/schema";
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
import { respondQuoteBody } from "@/lib/marketplace-constants";
import { getOwnedProvider, serQuote } from "@/lib/marketplace-owned";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const parsed = respondQuoteBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [existing] = await db.select().from(logisticsQuotesTable).where(eq(logisticsQuotesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [updated] = await db
      .update(logisticsQuotesTable)
      .set({
        quotedAmount: String(parsed.data.quotedAmount),
        providerResponse: parsed.data.providerResponse ? escapeHtml(parsed.data.providerResponse) : null,
        currency: parsed.data.currency?.toUpperCase() ?? existing.currency,
        status: parsed.data.status ?? "QUOTED",
        updatedAt: new Date(),
      })
      .where(eq(logisticsQuotesTable.id, id))
      .returning();

    await createNotification({
      userId: existing.requesterUserId,
      eventType: "QUOTE_SUBMITTED",
      title: "Logistics quote received",
      description: `Quote amount: ${updated.currency} ${updated.quotedAmount}`,
      relatedType: "LogisticsQuote",
      relatedId: id,
      category: "MARKETPLACE",
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGISTICS_QUOTE_SUBMITTED",
      entityType: "LogisticsQuote",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serQuote(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
