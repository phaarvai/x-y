import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorMaterialsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createMaterialBody } from "@/lib/marketplace-constants";
import { getOwnedProvider, serMaterial } from "@/lib/marketplace-owned";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serMaterial(row));
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

    const [existing] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = createMaterialBody.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const d = parsed.data;

    const [updated] = await db
      .update(vendorMaterialsTable)
      .set({
        ...(d.materialName != null ? { materialName: escapeHtml(d.materialName) } : {}),
        ...(d.category != null ? { category: d.category } : {}),
        ...(d.subCategory !== undefined ? { subCategory: d.subCategory } : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        ...(d.unit != null ? { unit: d.unit } : {}),
        ...(d.minimumOrderQuantity !== undefined
          ? { minimumOrderQuantity: d.minimumOrderQuantity != null ? String(d.minimumOrderQuantity) : null }
          : {}),
        ...(d.availableQuantity !== undefined
          ? { availableQuantity: d.availableQuantity != null ? String(d.availableQuantity) : null }
          : {}),
        ...(d.unitPrice != null ? { unitPrice: String(d.unitPrice) } : {}),
        ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
        ...(d.leadTime !== undefined ? { leadTime: d.leadTime } : {}),
        ...(d.availabilityStatus != null ? { availabilityStatus: d.availabilityStatus } : {}),
        ...(d.location !== undefined ? { location: d.location } : {}),
        ...(d.deliveryOptions !== undefined ? { deliveryOptions: d.deliveryOptions } : {}),
        ...(d.images !== undefined ? { images: d.images } : {}),
        ...(d.specifications !== undefined
          ? { specifications: d.specifications ? escapeHtml(d.specifications) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(vendorMaterialsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "VENDOR_MATERIAL_UPDATED",
      entityType: "VendorMaterial",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serMaterial(updated));
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

    const [existing] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db
      .update(vendorMaterialsTable)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(vendorMaterialsTable.id, id));

    await writeAuditLog({
      actorUserId: user.id,
      action: "VENDOR_MATERIAL_DELETED",
      entityType: "VendorMaterial",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
