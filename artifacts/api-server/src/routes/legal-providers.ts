import { Router } from "express";
import { db, legalServiceProvidersTable } from "@workspace/db";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import {
  requireUser,
  isLegalProviderRole,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import { createLegalProviderBody, updateLegalProviderBody } from "../lib/legal-schemas";

const router = Router();

function serializeProvider(p: typeof legalServiceProvidersTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    providerType: p.providerType,
    businessName: p.businessName,
    displayName: p.displayName,
    bio: p.bio,
    yearsExperience: p.yearsExperience,
    qualifications: p.qualifications,
    licenses: p.licenses,
    certifications: p.certifications,
    serviceCategories: p.serviceCategories,
    languages: p.languages,
    location: p.location,
    city: p.city,
    state: p.state,
    country: p.country,
    serviceRadius: p.serviceRadius,
    pricingType: p.pricingType,
    hourlyRate: p.hourlyRate,
    fixedPrice: p.fixedPrice,
    currency: p.currency,
    email: p.email,
    phone: p.phone,
    website: p.website,
    linkedin: p.linkedin,
    profileImage: p.profileImage,
    credentialsUrl: p.credentialsUrl,
    identityVerificationStatus: p.identityVerificationStatus,
    isPublished: p.isPublished,
    isAvailable: p.isAvailable,
    rating: p.rating,
    reviewCount: p.reviewCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function sanitizeText(value: string | null | undefined) {
  if (value == null) return value;
  return escapeHtml(value);
}

router.post("/legal-providers", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!isLegalProviderRole(user.primaryRole) && !isAdmin(user)) {
    return res.status(403).json({ error: "Only legal provider roles can create profiles" });
  }

  const parsed = createLegalProviderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const existing = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(eq(legalServiceProvidersTable.userId, user.id))
    .limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Legal provider profile already exists" });
  }

  const data = parsed.data;
  const [provider] = await db
    .insert(legalServiceProvidersTable)
    .values({
      userId: user.id,
      providerType: data.providerType,
      businessName: sanitizeText(data.businessName)!,
      displayName: sanitizeText(data.displayName)!,
      bio: sanitizeText(data.bio ?? null) ?? null,
      yearsExperience: data.yearsExperience ?? 0,
      qualifications: sanitizeText(data.qualifications ?? null) ?? null,
      licenses: sanitizeText(data.licenses ?? null) ?? null,
      certifications: sanitizeText(data.certifications ?? null) ?? null,
      serviceCategories: sanitizeText(data.serviceCategories ?? null) ?? null,
      languages: sanitizeText(data.languages ?? null) ?? null,
      location: sanitizeText(data.location ?? null) ?? null,
      city: sanitizeText(data.city ?? null) ?? null,
      state: sanitizeText(data.state ?? null) ?? null,
      country: sanitizeText(data.country ?? null) ?? null,
      serviceRadius: data.serviceRadius ?? null,
      pricingType: data.pricingType ?? "HOURLY",
      hourlyRate: data.hourlyRate != null ? String(data.hourlyRate) : null,
      fixedPrice: data.fixedPrice != null ? String(data.fixedPrice) : null,
      currency: data.currency ?? "INR",
      email: data.email ?? user.email,
      phone: data.phone ?? null,
      website: data.website || null,
      linkedin: data.linkedin || null,
      profileImage: data.profileImage ?? null,
      credentialsUrl: data.credentialsUrl ?? null,
    })
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "LEGAL_PROFILE_CREATED",
    entityType: "LegalServiceProvider",
    entityId: provider.id,
    ipAddress: clientIp(req),
  });

  return res.status(201).json(serializeProvider(provider));
});

router.get("/legal-providers", async (req, res) => {
  const {
    serviceCategory,
    providerType,
    location,
    city,
    minExperience,
    maxHourlyRate,
    minRating,
    availability,
    q,
    published,
    page = "1",
    limit = "20",
    mine,
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit || "20", 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];

  if (mine === "true") {
    const user = await requireUser(req, res);
    if (!user) return;
    conditions.push(eq(legalServiceProvidersTable.userId, user.id));
  } else if (published !== "false") {
    conditions.push(eq(legalServiceProvidersTable.isPublished, true));
  }

  if (providerType) conditions.push(eq(legalServiceProvidersTable.providerType, providerType));
  if (serviceCategory) {
    conditions.push(ilike(legalServiceProvidersTable.serviceCategories, `%${serviceCategory}%`));
  }
  if (location) {
    conditions.push(
      or(
        ilike(legalServiceProvidersTable.location, `%${location}%`),
        ilike(legalServiceProvidersTable.city, `%${location}%`),
        ilike(legalServiceProvidersTable.state, `%${location}%`),
        ilike(legalServiceProvidersTable.country, `%${location}%`),
      ),
    );
  }
  if (city) conditions.push(ilike(legalServiceProvidersTable.city, `%${city}%`));
  if (minExperience) {
    conditions.push(gte(legalServiceProvidersTable.yearsExperience, parseInt(minExperience, 10) || 0));
  }
  if (maxHourlyRate) {
    conditions.push(sql`${legalServiceProvidersTable.hourlyRate}::numeric <= ${maxHourlyRate}`);
  }
  if (minRating) {
    conditions.push(sql`${legalServiceProvidersTable.rating}::numeric >= ${minRating}`);
  }
  if (availability === "true") {
    conditions.push(eq(legalServiceProvidersTable.isAvailable, true));
  }
  if (q) {
    conditions.push(
      or(
        ilike(legalServiceProvidersTable.displayName, `%${q}%`),
        ilike(legalServiceProvidersTable.businessName, `%${q}%`),
        ilike(legalServiceProvidersTable.bio, `%${q}%`),
      ),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(where)
    .orderBy(desc(legalServiceProvidersTable.updatedAt))
    .limit(limitNum)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(legalServiceProvidersTable)
    .where(where);

  return res.status(200).json({
    items: rows.map(serializeProvider),
    total: count,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/legal-providers/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [provider] = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(eq(legalServiceProvidersTable.id, id))
    .limit(1);

  if (!provider) return res.status(404).json({ error: "Provider not found" });

  if (!provider.isPublished) {
    const user = await requireUser(req, res);
    if (!user) return;
    if (provider.userId !== user.id && !isAdmin(user)) {
      return res.status(404).json({ error: "Provider not found" });
    }
  }

  return res.status(200).json(serializeProvider(provider));
});

router.put("/legal-providers/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateLegalProviderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(eq(legalServiceProvidersTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Provider not found" });
  if (existing.userId !== user.id && !isAdmin(user)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const data = parsed.data;
  const [updated] = await db
    .update(legalServiceProvidersTable)
    .set({
      ...(data.providerType != null ? { providerType: data.providerType } : {}),
      ...(data.businessName != null ? { businessName: sanitizeText(data.businessName)! } : {}),
      ...(data.displayName != null ? { displayName: sanitizeText(data.displayName)! } : {}),
      ...(data.bio !== undefined ? { bio: sanitizeText(data.bio) ?? null } : {}),
      ...(data.yearsExperience != null ? { yearsExperience: data.yearsExperience } : {}),
      ...(data.qualifications !== undefined
        ? { qualifications: sanitizeText(data.qualifications) ?? null }
        : {}),
      ...(data.licenses !== undefined ? { licenses: sanitizeText(data.licenses) ?? null } : {}),
      ...(data.certifications !== undefined
        ? { certifications: sanitizeText(data.certifications) ?? null }
        : {}),
      ...(data.serviceCategories !== undefined
        ? { serviceCategories: sanitizeText(data.serviceCategories) ?? null }
        : {}),
      ...(data.languages !== undefined ? { languages: sanitizeText(data.languages) ?? null } : {}),
      ...(data.location !== undefined ? { location: sanitizeText(data.location) ?? null } : {}),
      ...(data.city !== undefined ? { city: sanitizeText(data.city) ?? null } : {}),
      ...(data.state !== undefined ? { state: sanitizeText(data.state) ?? null } : {}),
      ...(data.country !== undefined ? { country: sanitizeText(data.country) ?? null } : {}),
      ...(data.serviceRadius !== undefined ? { serviceRadius: data.serviceRadius } : {}),
      ...(data.pricingType != null ? { pricingType: data.pricingType } : {}),
      ...(data.hourlyRate !== undefined
        ? { hourlyRate: data.hourlyRate != null ? String(data.hourlyRate) : null }
        : {}),
      ...(data.fixedPrice !== undefined
        ? { fixedPrice: data.fixedPrice != null ? String(data.fixedPrice) : null }
        : {}),
      ...(data.currency != null ? { currency: data.currency } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.website !== undefined ? { website: data.website || null } : {}),
      ...(data.linkedin !== undefined ? { linkedin: data.linkedin || null } : {}),
      ...(data.profileImage !== undefined ? { profileImage: data.profileImage } : {}),
      ...(data.credentialsUrl !== undefined ? { credentialsUrl: data.credentialsUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(legalServiceProvidersTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "LEGAL_PROFILE_UPDATED",
    entityType: "LegalServiceProvider",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeProvider(updated));
});

router.patch("/legal-providers/:id/publish", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(eq(legalServiceProvidersTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Provider not found" });
  if (existing.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

  if (!existing.businessName || !existing.displayName || !existing.providerType) {
    return res.status(400).json({ error: "Profile incomplete" });
  }

  const [updated] = await db
    .update(legalServiceProvidersTable)
    .set({ isPublished: true, updatedAt: new Date() })
    .where(eq(legalServiceProvidersTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "LEGAL_PROFILE_PUBLISHED",
    entityType: "LegalServiceProvider",
    entityId: id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: user.id,
    eventType: "LEGAL_PROFILE_PUBLISHED",
    title: "Legal profile published",
    description: "Your legal service profile is now visible in search.",
    relatedType: "LegalServiceProvider",
    relatedId: id,
  });

  return res.status(200).json(serializeProvider(updated));
});

router.patch("/legal-providers/:id/unpublish", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(eq(legalServiceProvidersTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Provider not found" });
  if (existing.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db
    .update(legalServiceProvidersTable)
    .set({ isPublished: false, updatedAt: new Date() })
    .where(eq(legalServiceProvidersTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "LEGAL_PROFILE_UNPUBLISHED",
    entityType: "LegalServiceProvider",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeProvider(updated));
});

router.delete("/legal-providers/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db
    .select()
    .from(legalServiceProvidersTable)
    .where(eq(legalServiceProvidersTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Provider not found" });
  if (existing.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

  await db.delete(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.id, id));
  await writeAuditLog({
    actorUserId: user.id,
    action: "LEGAL_PROFILE_DELETED",
    entityType: "LegalServiceProvider",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json({ message: "Deleted" });
});

export default router;
