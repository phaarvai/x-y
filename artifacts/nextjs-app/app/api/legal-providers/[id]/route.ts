import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { legalServiceProvidersTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
  LEGAL_PROVIDER_ROLES,
} from "@/lib/legal-auth";

const updateBody = z.object({
  providerType: z.enum(LEGAL_PROVIDER_ROLES as unknown as [string, ...string[]]).optional(),
  businessName: z.string().min(2).max(255).optional(),
  displayName: z.string().min(2).max(255).optional(),
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
  serviceRadius: z.number().int().optional().nullable(),
  pricingType: z.enum(["HOURLY", "FIXED", "HYBRID"]).optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional().nullable(),
  fixedPrice: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  website: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  profileImage: z.string().optional().nullable(),
  credentialsUrl: z.string().optional().nullable(),
}).partial();

function serialize(p: typeof legalServiceProvidersTable.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const [provider] = await db.select().from(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.id, id)).limit(1);
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (!provider.isPublished) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      if (provider.userId !== user.id && !isAdmin(user)) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      }
    }
    return NextResponse.json(serialize(provider));
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

    const [existing] = await db.select().from(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (existing.userId !== user.id && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const [updated] = await db.update(legalServiceProvidersTable).set({
      ...(d.providerType != null ? { providerType: d.providerType } : {}),
      ...(d.businessName != null ? { businessName: escapeHtml(d.businessName) } : {}),
      ...(d.displayName != null ? { displayName: escapeHtml(d.displayName) } : {}),
      ...(d.bio !== undefined ? { bio: d.bio ? escapeHtml(d.bio) : null } : {}),
      ...(d.yearsExperience != null ? { yearsExperience: d.yearsExperience } : {}),
      ...(d.qualifications !== undefined ? { qualifications: d.qualifications ? escapeHtml(d.qualifications) : null } : {}),
      ...(d.licenses !== undefined ? { licenses: d.licenses ? escapeHtml(d.licenses) : null } : {}),
      ...(d.certifications !== undefined ? { certifications: d.certifications ? escapeHtml(d.certifications) : null } : {}),
      ...(d.serviceCategories !== undefined ? { serviceCategories: d.serviceCategories ? escapeHtml(d.serviceCategories) : null } : {}),
      ...(d.languages !== undefined ? { languages: d.languages ? escapeHtml(d.languages) : null } : {}),
      ...(d.location !== undefined ? { location: d.location ? escapeHtml(d.location) : null } : {}),
      ...(d.city !== undefined ? { city: d.city ? escapeHtml(d.city) : null } : {}),
      ...(d.state !== undefined ? { state: d.state ? escapeHtml(d.state) : null } : {}),
      ...(d.country !== undefined ? { country: d.country ? escapeHtml(d.country) : null } : {}),
      ...(d.serviceRadius !== undefined ? { serviceRadius: d.serviceRadius } : {}),
      ...(d.pricingType != null ? { pricingType: d.pricingType } : {}),
      ...(d.hourlyRate !== undefined ? { hourlyRate: d.hourlyRate != null ? String(d.hourlyRate) : null } : {}),
      ...(d.fixedPrice !== undefined ? { fixedPrice: d.fixedPrice != null ? String(d.fixedPrice) : null } : {}),
      ...(d.currency != null ? { currency: d.currency } : {}),
      ...(d.email !== undefined ? { email: d.email } : {}),
      ...(d.phone !== undefined ? { phone: d.phone } : {}),
      ...(d.website !== undefined ? { website: d.website || null } : {}),
      ...(d.linkedin !== undefined ? { linkedin: d.linkedin || null } : {}),
      ...(d.profileImage !== undefined ? { profileImage: d.profileImage } : {}),
      ...(d.credentialsUrl !== undefined ? { credentialsUrl: d.credentialsUrl } : {}),
      updatedAt: new Date(),
    }).where(eq(legalServiceProvidersTable.id, id)).returning();

    await writeAuditLog({ actorUserId: user.id, action: "LEGAL_PROFILE_UPDATED", entityType: "LegalServiceProvider", entityId: id, ipAddress: clientIp(req) });
    return NextResponse.json(serialize(updated));
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
    const [existing] = await db.select().from(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (existing.userId !== user.id && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await db.delete(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.id, id));
    await writeAuditLog({ actorUserId: user.id, action: "LEGAL_PROFILE_DELETED", entityType: "LegalServiceProvider", entityId: id, ipAddress: clientIp(req) });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
