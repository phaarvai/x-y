import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logisticsServicesTable } from "@/lib/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createLogisticsBody } from "@/lib/marketplace-constants";
import { parsePageLimit } from "@/lib/marketplace-helpers";
import { getOwnedProvider, serLog } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);
    const conditions = [eq(logisticsServicesTable.isPublished, true)];

    if (searchParams.get("serviceType")) {
      conditions.push(eq(logisticsServicesTable.serviceType, String(searchParams.get("serviceType"))));
    }
    if (searchParams.get("coverage")) {
      conditions.push(ilike(logisticsServicesTable.coverageAreas, `%${searchParams.get("coverage")}%`));
    }
    if (searchParams.get("mine") === "true") {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user));
      if (!provider) return NextResponse.json({ items: [], total: 0, page, limit });
      conditions.length = 0;
      conditions.push(eq(logisticsServicesTable.providerId, provider.id));
    }

    const where = and(...conditions);
    const rows = await db
      .select()
      .from(logisticsServicesTable)
      .where(where)
      .orderBy(desc(logisticsServicesTable.updatedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(logisticsServicesTable)
      .where(where);

    return NextResponse.json({ items: rows.map(serLog), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user));
    if (!provider) return NextResponse.json({ error: "Logistics profile required" }, { status: 403 });

    const body = await req.json();
    const parsed = createLogisticsBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const [row] = await db
      .insert(logisticsServicesTable)
      .values({
        providerId: provider.id,
        serviceType: d.serviceType,
        vehicleType: d.vehicleType ?? null,
        storageType: d.storageType ?? null,
        capacity: d.capacity ?? null,
        coverageAreas: d.coverageAreas ?? null,
        pricingModel: d.pricingModel ?? null,
        minimumCharge: d.minimumCharge != null ? String(d.minimumCharge) : null,
        currency: (d.currency || "INR").toUpperCase(),
        estimatedDelivery: d.estimatedDelivery ?? null,
        insuranceAvailable: d.insuranceAvailable ?? false,
        trackingAvailable: d.trackingAvailable ?? false,
        description: d.description ? escapeHtml(d.description) : null,
      })
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGISTICS_SERVICE_CREATED",
      entityType: "LogisticsService",
      entityId: row.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serLog(row), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
