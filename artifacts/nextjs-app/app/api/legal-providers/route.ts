import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { legalServiceProvidersTable } from "@/lib/schema";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isLegalProviderRole,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
  LEGAL_PROVIDER_ROLES,
} from "@/lib/legal-auth";

const createBody = z.object({
  providerType: z.enum(LEGAL_PROVIDER_ROLES as unknown as [string, ...string[]]),
  businessName: z.string().min(2).max(255),
  displayName: z.string().min(2).max(255),
  bio: z.string().max(5000).optional().nullable(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  qualifications: z.string().max(2000).optional().nullable(),
  licenses: z.string().max(2000).optional().nullable(),
  certifications: z.string().max(2000).optional().nullable(),
  serviceCategories: z.string().max(2000).optional().nullable(),
  languages: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  serviceRadius: z.number().int().min(0).max(5000).optional().nullable(),
  pricingType: z.enum(["HOURLY", "FIXED", "HYBRID"]).optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional().nullable(),
  fixedPrice: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  website: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  profileImage: z.string().max(2000).optional().nullable(),
  credentialsUrl: z.string().max(2000).optional().nullable(),
});

function serialize(p: typeof legalServiceProvidersTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const offset = (page - 1) * limit;
    const conditions = [];

    if (mine) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      conditions.push(eq(legalServiceProvidersTable.userId, user.id));
    } else {
      conditions.push(eq(legalServiceProvidersTable.isPublished, true));
    }

    const providerType = searchParams.get("providerType");
    const serviceCategory = searchParams.get("serviceCategory");
    const location = searchParams.get("location");
    const minExperience = searchParams.get("minExperience");
    const maxHourlyRate = searchParams.get("maxHourlyRate");
    const minRating = searchParams.get("minRating");
    const availability = searchParams.get("availability");
    const q = searchParams.get("q");

    if (providerType) conditions.push(eq(legalServiceProvidersTable.providerType, providerType));
    if (serviceCategory) conditions.push(ilike(legalServiceProvidersTable.serviceCategories, `%${serviceCategory}%`));
    if (location) {
      conditions.push(or(
        ilike(legalServiceProvidersTable.city, `%${location}%`),
        ilike(legalServiceProvidersTable.state, `%${location}%`),
        ilike(legalServiceProvidersTable.country, `%${location}%`),
        ilike(legalServiceProvidersTable.location, `%${location}%`),
      ));
    }
    if (minExperience) conditions.push(gte(legalServiceProvidersTable.yearsExperience, parseInt(minExperience, 10) || 0));
    if (maxHourlyRate) conditions.push(sql`${legalServiceProvidersTable.hourlyRate}::numeric <= ${maxHourlyRate}`);
    if (minRating) conditions.push(sql`${legalServiceProvidersTable.rating}::numeric >= ${minRating}`);
    if (availability === "true") conditions.push(eq(legalServiceProvidersTable.isAvailable, true));
    if (q) {
      conditions.push(or(
        ilike(legalServiceProvidersTable.displayName, `%${q}%`),
        ilike(legalServiceProvidersTable.businessName, `%${q}%`),
        ilike(legalServiceProvidersTable.bio, `%${q}%`),
      ));
    }

    const where = and(...conditions);
    const rows = await db.select().from(legalServiceProvidersTable).where(where).orderBy(desc(legalServiceProvidersTable.updatedAt)).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(legalServiceProvidersTable).where(where);

    return NextResponse.json({ items: rows.map(serialize), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isLegalProviderRole(user.primaryRole) && !isAdmin(user)) {
      return NextResponse.json({ error: "Only legal provider roles can create profiles" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const existing = await db.select().from(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.userId, user.id)).limit(1);
    if (existing.length) return NextResponse.json({ error: "Legal provider profile already exists" }, { status: 409 });

    const d = parsed.data;
    const [provider] = await db.insert(legalServiceProvidersTable).values({
      userId: user.id,
      providerType: d.providerType,
      businessName: escapeHtml(d.businessName),
      displayName: escapeHtml(d.displayName),
      bio: d.bio ? escapeHtml(d.bio) : null,
      yearsExperience: d.yearsExperience ?? 0,
      qualifications: d.qualifications ? escapeHtml(d.qualifications) : null,
      licenses: d.licenses ? escapeHtml(d.licenses) : null,
      certifications: d.certifications ? escapeHtml(d.certifications) : null,
      serviceCategories: d.serviceCategories ? escapeHtml(d.serviceCategories) : null,
      languages: d.languages ? escapeHtml(d.languages) : null,
      location: d.location ? escapeHtml(d.location) : null,
      city: d.city ? escapeHtml(d.city) : null,
      state: d.state ? escapeHtml(d.state) : null,
      country: d.country ? escapeHtml(d.country) : null,
      serviceRadius: d.serviceRadius ?? null,
      pricingType: d.pricingType ?? "HOURLY",
      hourlyRate: d.hourlyRate != null ? String(d.hourlyRate) : null,
      fixedPrice: d.fixedPrice != null ? String(d.fixedPrice) : null,
      currency: d.currency ?? "INR",
      email: d.email ?? user.email,
      phone: d.phone ?? null,
      website: d.website || null,
      linkedin: d.linkedin || null,
      profileImage: d.profileImage ?? null,
      credentialsUrl: d.credentialsUrl ?? null,
    }).returning();

    await writeAuditLog({ actorUserId: user.id, action: "LEGAL_PROFILE_CREATED", entityType: "LegalServiceProvider", entityId: provider.id, ipAddress: clientIp(req) });
    return NextResponse.json(serialize(provider), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
