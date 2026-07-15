import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorMaterialsTable } from "@/lib/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createMaterialBody } from "@/lib/marketplace-constants";
import { parsePageLimit } from "@/lib/marketplace-helpers";
import { getOwnedProvider, serMaterial } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);
    const conditions = [eq(vendorMaterialsTable.isPublished, true)];

    if (searchParams.get("category")) {
      conditions.push(ilike(vendorMaterialsTable.category, `%${searchParams.get("category")}%`));
    }
    if (searchParams.get("location")) {
      conditions.push(ilike(vendorMaterialsTable.location, `%${searchParams.get("location")}%`));
    }
    if (searchParams.get("availability")) {
      conditions.push(eq(vendorMaterialsTable.availabilityStatus, String(searchParams.get("availability"))));
    }
    if (searchParams.get("q")) {
      conditions.push(ilike(vendorMaterialsTable.materialName, `%${searchParams.get("q")}%`));
    }
    if (searchParams.get("minPrice")) {
      conditions.push(sql`${vendorMaterialsTable.unitPrice}::numeric >= ${searchParams.get("minPrice")}`);
    }
    if (searchParams.get("maxPrice")) {
      conditions.push(sql`${vendorMaterialsTable.unitPrice}::numeric <= ${searchParams.get("maxPrice")}`);
    }
    if (searchParams.get("maxMoq")) {
      conditions.push(
        sql`${vendorMaterialsTable.minimumOrderQuantity}::numeric <= ${searchParams.get("maxMoq")}`,
      );
    }
    if (searchParams.get("mine") === "true") {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user));
      if (!provider) return NextResponse.json({ items: [], total: 0, page, limit });
      conditions.length = 0;
      conditions.push(eq(vendorMaterialsTable.providerId, provider.id));
    }

    const where = and(...conditions);
    const rows = await db
      .select()
      .from(vendorMaterialsTable)
      .where(where)
      .orderBy(desc(vendorMaterialsTable.updatedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendorMaterialsTable)
      .where(where);

    return NextResponse.json({ items: rows.map(serMaterial), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user));
    if (!provider) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

    const body = await req.json();
    const parsed = createMaterialBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const [row] = await db
      .insert(vendorMaterialsTable)
      .values({
        providerId: provider.id,
        materialName: escapeHtml(d.materialName),
        category: d.category,
        subCategory: d.subCategory ?? null,
        description: d.description ? escapeHtml(d.description) : null,
        unit: d.unit ?? "KG",
        minimumOrderQuantity: d.minimumOrderQuantity != null ? String(d.minimumOrderQuantity) : null,
        availableQuantity: d.availableQuantity != null ? String(d.availableQuantity) : null,
        unitPrice: String(d.unitPrice),
        currency: (d.currency || "INR").toUpperCase(),
        leadTime: d.leadTime ?? null,
        availabilityStatus: d.availabilityStatus ?? "AVAILABLE",
        location: d.location ?? null,
        deliveryOptions: d.deliveryOptions ?? null,
        images: d.images ?? null,
        specifications: d.specifications ? escapeHtml(d.specifications) : null,
      })
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "VENDOR_MATERIAL_CREATED",
      entityType: "VendorMaterial",
      entityId: row.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serMaterial(row), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
