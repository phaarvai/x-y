import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logisticsQuotesTable, serviceProviderProfilesTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createQuoteBody } from "@/lib/marketplace-constants";
import { parsePageLimit } from "@/lib/marketplace-helpers";
import { getOwnedProvider, serQuote } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);
    const asProvider = searchParams.get("as") === "provider";

    let conditions;
    if (asProvider) {
      const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user));
      if (!provider) return NextResponse.json({ items: [], total: 0, page, limit });
      conditions = [eq(logisticsQuotesTable.providerId, provider.id)];
    } else {
      conditions = [eq(logisticsQuotesTable.requesterUserId, user.id)];
    }

    const where = and(...conditions);
    const rows = await db
      .select()
      .from(logisticsQuotesTable)
      .where(where)
      .orderBy(desc(logisticsQuotesTable.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ items: rows.map(serQuote), page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const body = await req.json();
    const parsed = createQuoteBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [provider] = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, parsed.data.providerId))
      .limit(1);
    if (!provider || provider.providerType !== "LOGISTICS_PROVIDER") {
      return NextResponse.json({ error: "Logistics provider not found" }, { status: 404 });
    }

    const [quote] = await db
      .insert(logisticsQuotesTable)
      .values({
        serviceId: parsed.data.serviceId ?? null,
        providerId: parsed.data.providerId,
        requestId: parsed.data.requestId ?? null,
        requesterUserId: user.id,
        pickupLocation: parsed.data.pickupLocation ?? null,
        dropLocation: parsed.data.dropLocation ?? null,
        cargoDetails: parsed.data.cargoDetails ? escapeHtml(parsed.data.cargoDetails) : null,
        requestedDate: parsed.data.requestedDate ? new Date(parsed.data.requestedDate) : null,
        status: "REQUESTED",
      })
      .returning();

    await createNotification({
      userId: provider.userId,
      eventType: "QUOTE_REQUESTED",
      title: "New logistics quote request",
      description: "A user requested a quote for your logistics service.",
      relatedType: "LogisticsQuote",
      relatedId: quote.id,
      category: "MARKETPLACE",
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGISTICS_QUOTE_REQUESTED",
      entityType: "LogisticsQuote",
      entityId: quote.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serQuote(quote), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
