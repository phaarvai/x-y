import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  vendorMaterialsTable,
  vendorInquiriesTable,
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
import { inquiryBody } from "@/lib/marketplace-constants";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const parsed = inquiryBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [material] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
    if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

    const [provider] = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, material.providerId))
      .limit(1);

    const [inq] = await db
      .insert(vendorInquiriesTable)
      .values({
        materialId: id,
        providerId: material.providerId,
        inquirerUserId: user.id,
        message: escapeHtml(parsed.data.message),
      })
      .returning();

    if (provider) {
      await createNotification({
        userId: provider.userId,
        eventType: "INQUIRY_RECEIVED",
        title: "Material inquiry received",
        description: `Inquiry on ${material.materialName}`,
        relatedType: "VendorInquiry",
        relatedId: inq.id,
        category: "MARKETPLACE",
      });
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "VENDOR_INQUIRY_CREATED",
      entityType: "VendorInquiry",
      entityId: inq.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(
      {
        ...inq,
        createdAt: inq.createdAt.toISOString(),
        updatedAt: inq.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
