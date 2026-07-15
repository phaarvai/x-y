import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceProviderProfilesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { updateProviderBody } from "@/lib/marketplace-constants";
import { serProvider } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, id))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!row.isPublished) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      if (row.userId !== user.id && !isAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json(serProvider(row));
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
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateProviderBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    const [updated] = await db
      .update(serviceProviderProfilesTable)
      .set({
        ...(d.companyName != null ? { companyName: escapeHtml(d.companyName) } : {}),
        ...(d.displayName != null ? { displayName: escapeHtml(d.displayName) } : {}),
        ...(d.serviceCategories !== undefined
          ? { serviceCategories: d.serviceCategories ? escapeHtml(d.serviceCategories) : null }
          : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        ...(d.businessType !== undefined ? { businessType: d.businessType } : {}),
        ...(d.experienceYears != null ? { experienceYears: d.experienceYears } : {}),
        ...(d.certifications !== undefined
          ? { certifications: d.certifications ? escapeHtml(d.certifications) : null }
          : {}),
        ...(d.licenses !== undefined ? { licenses: d.licenses ? escapeHtml(d.licenses) : null } : {}),
        ...(d.location !== undefined ? { location: d.location } : {}),
        ...(d.city !== undefined ? { city: d.city } : {}),
        ...(d.state !== undefined ? { state: d.state } : {}),
        ...(d.country !== undefined ? { country: d.country } : {}),
        ...(d.serviceableAreas !== undefined ? { serviceableAreas: d.serviceableAreas } : {}),
        ...(d.pricingModel !== undefined ? { pricingModel: d.pricingModel } : {}),
        ...(d.contactEmail !== undefined ? { contactEmail: d.contactEmail } : {}),
        ...(d.contactPhone !== undefined ? { contactPhone: d.contactPhone } : {}),
        ...(d.website !== undefined ? { website: d.website } : {}),
        ...(d.socialLinks !== undefined ? { socialLinks: d.socialLinks } : {}),
        ...(d.profileImage !== undefined ? { profileImage: d.profileImage } : {}),
        updatedAt: new Date(),
      })
      .where(eq(serviceProviderProfilesTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "SERVICE_PROVIDER_UPDATED",
      entityType: "ServiceProviderProfile",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serProvider(updated));
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
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(serviceProviderProfilesTable)
      .set({ isPublished: false, isAvailable: false, updatedAt: new Date() })
      .where(eq(serviceProviderProfilesTable.id, id));

    await writeAuditLog({
      actorUserId: user.id,
      action: "SERVICE_PROVIDER_DELETED",
      entityType: "ServiceProviderProfile",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ message: "Profile unpublished/removed" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
