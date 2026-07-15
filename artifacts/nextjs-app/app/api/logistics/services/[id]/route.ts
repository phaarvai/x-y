import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logisticsServicesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createLogisticsBody } from "@/lib/marketplace-constants";
import { getOwnedProvider, serLog } from "@/lib/marketplace-owned";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serLog(row));
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

    const [existing] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = createLogisticsBody.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const d = parsed.data;

    const [updated] = await db
      .update(logisticsServicesTable)
      .set({
        ...(d.serviceType != null ? { serviceType: d.serviceType } : {}),
        ...(d.vehicleType !== undefined ? { vehicleType: d.vehicleType } : {}),
        ...(d.storageType !== undefined ? { storageType: d.storageType } : {}),
        ...(d.capacity !== undefined ? { capacity: d.capacity } : {}),
        ...(d.coverageAreas !== undefined ? { coverageAreas: d.coverageAreas } : {}),
        ...(d.pricingModel !== undefined ? { pricingModel: d.pricingModel } : {}),
        ...(d.minimumCharge !== undefined
          ? { minimumCharge: d.minimumCharge != null ? String(d.minimumCharge) : null }
          : {}),
        ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
        ...(d.estimatedDelivery !== undefined ? { estimatedDelivery: d.estimatedDelivery } : {}),
        ...(d.insuranceAvailable != null ? { insuranceAvailable: d.insuranceAvailable } : {}),
        ...(d.trackingAvailable != null ? { trackingAvailable: d.trackingAvailable } : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(logisticsServicesTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGISTICS_SERVICE_UPDATED",
      entityType: "LogisticsService",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serLog(updated));
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

    const [existing] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db
      .update(logisticsServicesTable)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(logisticsServicesTable.id, id));

    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGISTICS_SERVICE_DELETED",
      entityType: "LogisticsService",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
