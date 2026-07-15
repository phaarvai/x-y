import { Router } from "express";
import { db, serviceProviderProfilesTable } from "@workspace/db";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import {
  createProviderBody,
  updateProviderBody,
  canCreateProviderType,
  SERVICE_PROVIDER_TYPES,
} from "../lib/marketplace-schemas";

const router = Router();

function serialize(p: typeof serviceProviderProfilesTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.post("/service-providers", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = createProviderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  if (!canCreateProviderType(user.primaryRole, parsed.data.providerType, isAdmin(user))) {
    return res.status(403).json({ error: "Role cannot create this provider type" });
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

    return res.status(201).json(serialize(row));
  } catch {
    return res.status(409).json({ error: "Provider profile of this type already exists for user" });
  }
});

router.get("/service-providers", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const mine = req.query.mine === "true";
  const providerType = req.query.providerType ? String(req.query.providerType) : undefined;
  const location = req.query.location ? String(req.query.location) : undefined;
  const industry = req.query.industry ? String(req.query.industry) : undefined;
  const verification = req.query.verification ? String(req.query.verification) : undefined;
  const minRating = req.query.minRating ? String(req.query.minRating) : undefined;
  const availability = req.query.availability;
  const pricingModel = req.query.pricingModel ? String(req.query.pricingModel) : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;

  const conditions = [];
  if (mine) {
    const user = await requireUser(req, res);
    if (!user) return;
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
    .offset((page - 1) * limit);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceProviderProfilesTable)
    .where(where);

  return res.status(200).json({ items: rows.map(serialize), total: count, page, limit });
});

router.get("/service-providers/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (!row.isPublished) {
    const user = await requireUser(req, res);
    if (!user) return;
    if (row.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  }
  return res.status(200).json(serialize(row));
});

router.put("/service-providers/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

  const parsed = updateProviderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const d = parsed.data;

  const [updated] = await db
    .update(serviceProviderProfilesTable)
    .set({
      ...(d.companyName != null ? { companyName: escapeHtml(d.companyName) } : {}),
      ...(d.displayName != null ? { displayName: escapeHtml(d.displayName) } : {}),
      ...(d.serviceCategories !== undefined
        ? { serviceCategories: d.serviceCategories ? escapeHtml(d.serviceCategories) : null }
        : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
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

  return res.status(200).json(serialize(updated));
});

async function setPublished(req: any, res: any, published: boolean) {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db
    .update(serviceProviderProfilesTable)
    .set({ isPublished: published, updatedAt: new Date() })
    .where(eq(serviceProviderProfilesTable.id, id))
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: published ? "SERVICE_PROVIDER_PUBLISHED" : "SERVICE_PROVIDER_UNPUBLISHED",
    entityType: "ServiceProviderProfile",
    entityId: id,
    ipAddress: clientIp(req),
  });
  if (published) {
    await createNotification({
      userId: user.id,
      eventType: "PROVIDER_PROFILE_PUBLISHED",
      title: "Profile published",
      description: "Your service provider profile is now visible in search.",
      relatedType: "ServiceProviderProfile",
      relatedId: id,
      category: "MARKETPLACE",
    });
  }
  return res.status(200).json(serialize(updated));
}

router.patch("/service-providers/:id/publish", (req, res) => setPublished(req, res, true));
router.patch("/service-providers/:id/unpublish", (req, res) => setPublished(req, res, false));

router.delete("/service-providers/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.userId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });

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
  return res.status(200).json({ message: "Profile unpublished/removed" });
});

export default router;
