import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceProviderProfilesTable } from "@/lib/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import {
  createProviderBody,
  canCreateProviderType,
  SERVICE_PROVIDER_TYPES,
} from "@/lib/marketplace-constants";
import { parsePageLimit } from "@/lib/marketplace-helpers";
import { serProvider } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);
    const mine = searchParams.get("mine") === "true";
    const providerType = searchParams.get("providerType") || undefined;
    const location = searchParams.get("location") || undefined;
    const industry = searchParams.get("industry") || undefined;
    const verification = searchParams.get("verification") || undefined;
    const minRating = searchParams.get("minRating") || undefined;
    const availability = searchParams.get("availability");
    const pricingModel = searchParams.get("pricingModel") || undefined;
    const q = searchParams.get("q") || undefined;

    const conditions = [];
    if (mine) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      conditions.push(eq(serviceProviderProfilesTable.userId, user.id));
    } else {
      conditions.push(eq(serviceProviderProfilesTable.isPublished, true));
    }
    if (providerType && (SERVICE_PROVIDER_TYPES as readonly string[]).includes(providerType)) {
      conditions.push(eq(serviceProviderProfilesTable.providerType, providerType));
    }
    if (location) {
      conditions.push(
        or(
          ilike(serviceProviderProfilesTable.city, `%${location}%`),
          ilike(serviceProviderProfilesTable.state, `%${location}%`),
          ilike(serviceProviderProfilesTable.country, `%${location}%`),
          ilike(serviceProviderProfilesTable.location, `%${location}%`),
        )!,
      );
    }
    if (industry) conditions.push(ilike(serviceProviderProfilesTable.serviceCategories, `%${industry}%`));
    if (verification) conditions.push(eq(serviceProviderProfilesTable.verificationStatus, verification));
    if (minRating) conditions.push(sql`${serviceProviderProfilesTable.rating}::numeric >= ${minRating}`);
    if (availability === "true") conditions.push(eq(serviceProviderProfilesTable.isAvailable, true));
    if (pricingModel) conditions.push(eq(serviceProviderProfilesTable.pricingModel, pricingModel));
    if (q) {
      conditions.push(
        or(
          ilike(serviceProviderProfilesTable.displayName, `%${q}%`),
          ilike(serviceProviderProfilesTable.companyName, `%${q}%`),
          ilike(serviceProviderProfilesTable.description, `%${q}%`),
        )!,
      );
    }

    const where = and(...conditions);
    const rows = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(where)
      .orderBy(desc(serviceProviderProfilesTable.updatedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceProviderProfilesTable)
      .where(where);

    return NextResponse.json({ items: rows.map(serProvider), total: count, page, limit });
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
    const parsed = createProviderBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    if (!canCreateProviderType(user.primaryRole, parsed.data.providerType, isAdmin(user))) {
      return NextResponse.json({ error: "Role cannot create this provider type" }, { status: 403 });
    }

    try {
      const d = parsed.data;
      const [row] = await db
        .insert(serviceProviderProfilesTable)
        .values({
          userId: user.id,
          providerType: d.providerType,
          companyName: escapeHtml(d.companyName),
          displayName: escapeHtml(d.displayName),
          serviceCategories: d.serviceCategories ? escapeHtml(d.serviceCategories) : null,
          description: d.description ? escapeHtml(d.description) : null,
          businessType: d.businessType ?? null,
          experienceYears: d.experienceYears ?? 0,
          certifications: d.certifications ? escapeHtml(d.certifications) : null,
          licenses: d.licenses ? escapeHtml(d.licenses) : null,
          location: d.location ?? null,
          city: d.city ?? null,
          state: d.state ?? null,
          country: d.country ?? null,
          serviceableAreas: d.serviceableAreas ?? null,
          pricingModel: d.pricingModel ?? null,
          contactEmail: d.contactEmail ?? null,
          contactPhone: d.contactPhone ?? null,
          website: d.website ?? null,
          socialLinks: d.socialLinks ?? null,
          profileImage: d.profileImage ?? null,
          isPublished: false,
        })
        .returning();

      await writeAuditLog({
        actorUserId: user.id,
        action: "SERVICE_PROVIDER_CREATED",
        entityType: "ServiceProviderProfile",
        entityId: row.id,
        ipAddress: clientIp(req),
      });

      return NextResponse.json(serProvider(row), { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Provider profile of this type already exists for user" },
        { status: 409 },
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
