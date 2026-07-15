import { Router } from "express";
import {
  db,
  serviceProviderProfilesTable,
  vendorMaterialsTable,
  vendorInquiriesTable,
  laborListingsTable,
  laborInquiriesTable,
  logisticsServicesTable,
  logisticsQuotesTable,
} from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import {
  createMaterialBody,
  createLaborBody,
  createLogisticsBody,
  createQuoteBody,
  respondQuoteBody,
  inquiryBody,
} from "../lib/marketplace-schemas";

const router = Router();

async function getOwnedProvider(userId: number, type: string, admin: boolean, providerId?: number) {
  const conditions = [eq(serviceProviderProfilesTable.providerType, type)];
  if (!admin) conditions.push(eq(serviceProviderProfilesTable.userId, userId));
  if (providerId) conditions.push(eq(serviceProviderProfilesTable.id, providerId));
  const [p] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(and(...conditions))
    .limit(1);
  return p ?? null;
}

function serMaterial(m: typeof vendorMaterialsTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() };
}
function serLabor(m: typeof laborListingsTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() };
}
function serLog(m: typeof logisticsServicesTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() };
}
function serQuote(q: typeof logisticsQuotesTable.$inferSelect) {
  return {
    ...q,
    requestedDate: q.requestedDate?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

// —— Vendor materials ——
router.post("/vendors/materials", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user));
  if (!provider) return res.status(403).json({ error: "Vendor profile required" });
  const parsed = createMaterialBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
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
  return res.status(201).json(serMaterial(row));
});

router.get("/vendors/materials", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const conditions = [eq(vendorMaterialsTable.isPublished, true)];
  if (req.query.category) conditions.push(ilike(vendorMaterialsTable.category, `%${req.query.category}%`));
  if (req.query.location) conditions.push(ilike(vendorMaterialsTable.location, `%${req.query.location}%`));
  if (req.query.availability) conditions.push(eq(vendorMaterialsTable.availabilityStatus, String(req.query.availability)));
  if (req.query.q) conditions.push(ilike(vendorMaterialsTable.materialName, `%${req.query.q}%`));
  if (req.query.minPrice) conditions.push(sql`${vendorMaterialsTable.unitPrice}::numeric >= ${req.query.minPrice}`);
  if (req.query.maxPrice) conditions.push(sql`${vendorMaterialsTable.unitPrice}::numeric <= ${req.query.maxPrice}`);
  if (req.query.maxMoq) conditions.push(sql`${vendorMaterialsTable.minimumOrderQuantity}::numeric <= ${req.query.maxMoq}`);
  if (req.query.mine === "true") {
    const user = await requireUser(req, res);
    if (!user) return;
    const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user));
    if (!provider) return res.status(200).json({ items: [], total: 0, page, limit });
    conditions.length = 0;
    conditions.push(eq(vendorMaterialsTable.providerId, provider.id));
  }
  const where = and(...conditions);
  const rows = await db.select().from(vendorMaterialsTable).where(where).orderBy(desc(vendorMaterialsTable.updatedAt)).limit(limit).offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorMaterialsTable).where(where);
  return res.status(200).json({ items: rows.map(serMaterial), total: count, page, limit });
});

router.get("/vendors/materials/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.status(200).json(serMaterial(row));
});

router.put("/vendors/materials/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  const parsed = createMaterialBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const [updated] = await db
    .update(vendorMaterialsTable)
    .set({
      ...(d.materialName != null ? { materialName: escapeHtml(d.materialName) } : {}),
      ...(d.category != null ? { category: d.category } : {}),
      ...(d.subCategory !== undefined ? { subCategory: d.subCategory } : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
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
  return res.status(200).json(serMaterial(updated));
});

router.delete("/vendors/materials/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "VENDOR", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  await db.update(vendorMaterialsTable).set({ isPublished: false, updatedAt: new Date() }).where(eq(vendorMaterialsTable.id, id));
  await writeAuditLog({
    actorUserId: user.id,
    action: "VENDOR_MATERIAL_DELETED",
    entityType: "VendorMaterial",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({ message: "Deleted" });
});

router.post("/vendors/materials/:id/inquiries", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = inquiryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const [material] = await db.select().from(vendorMaterialsTable).where(eq(vendorMaterialsTable.id, id)).limit(1);
  if (!material) return res.status(404).json({ error: "Material not found" });
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
  return res.status(201).json({
    ...inq,
    createdAt: inq.createdAt.toISOString(),
    updatedAt: inq.updatedAt.toISOString(),
  });
});

// —— Labor ——
router.post("/labor/listings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user));
  if (!provider) return res.status(403).json({ error: "Labor supplier profile required" });
  const parsed = createLaborBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const d = parsed.data;
  const [row] = await db
    .insert(laborListingsTable)
    .values({
      providerId: provider.id,
      workerType: d.workerType,
      skillCategory: escapeHtml(d.skillCategory),
      experienceLevel: d.experienceLevel ?? null,
      workerCount: d.workerCount ?? 1,
      availability: d.availability ?? "AVAILABLE",
      availabilityCalendar: d.availabilityCalendar ?? null,
      city: d.city ?? null,
      state: d.state ?? null,
      country: d.country ?? null,
      dailyRate: d.dailyRate != null ? String(d.dailyRate) : null,
      monthlyRate: d.monthlyRate != null ? String(d.monthlyRate) : null,
      currency: (d.currency || "INR").toUpperCase(),
      description: d.description ? escapeHtml(d.description) : null,
    })
    .returning();
  await writeAuditLog({
    actorUserId: user.id,
    action: "LABOR_LISTING_CREATED",
    entityType: "LaborListing",
    entityId: row.id,
    ipAddress: clientIp(req),
  });
  return res.status(201).json(serLabor(row));
});

router.get("/labor/listings", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const conditions = [eq(laborListingsTable.isPublished, true)];
  if (req.query.city) conditions.push(ilike(laborListingsTable.city, `%${req.query.city}%`));
  if (req.query.skill) conditions.push(ilike(laborListingsTable.skillCategory, `%${req.query.skill}%`));
  if (req.query.availability) conditions.push(eq(laborListingsTable.availability, String(req.query.availability)));
  if (req.query.experience) conditions.push(ilike(laborListingsTable.experienceLevel, `%${req.query.experience}%`));
  if (req.query.maxDailyRate) conditions.push(sql`${laborListingsTable.dailyRate}::numeric <= ${req.query.maxDailyRate}`);
  if (req.query.mine === "true") {
    const user = await requireUser(req, res);
    if (!user) return;
    const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user));
    if (!provider) return res.status(200).json({ items: [], total: 0, page, limit });
    conditions.length = 0;
    conditions.push(eq(laborListingsTable.providerId, provider.id));
  }
  const where = and(...conditions);
  const rows = await db.select().from(laborListingsTable).where(where).orderBy(desc(laborListingsTable.updatedAt)).limit(limit).offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(laborListingsTable).where(where);
  return res.status(200).json({ items: rows.map(serLabor), total: count, page, limit });
});

router.get("/labor/listings/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.status(200).json(serLabor(row));
});

router.put("/labor/listings/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  const parsed = createLaborBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const [updated] = await db
    .update(laborListingsTable)
    .set({
      ...(d.workerType != null ? { workerType: d.workerType } : {}),
      ...(d.skillCategory != null ? { skillCategory: escapeHtml(d.skillCategory) } : {}),
      ...(d.experienceLevel !== undefined ? { experienceLevel: d.experienceLevel } : {}),
      ...(d.workerCount != null ? { workerCount: d.workerCount } : {}),
      ...(d.availability != null ? { availability: d.availability } : {}),
      ...(d.availabilityCalendar !== undefined ? { availabilityCalendar: d.availabilityCalendar } : {}),
      ...(d.city !== undefined ? { city: d.city } : {}),
      ...(d.state !== undefined ? { state: d.state } : {}),
      ...(d.country !== undefined ? { country: d.country } : {}),
      ...(d.dailyRate !== undefined ? { dailyRate: d.dailyRate != null ? String(d.dailyRate) : null } : {}),
      ...(d.monthlyRate !== undefined ? { monthlyRate: d.monthlyRate != null ? String(d.monthlyRate) : null } : {}),
      ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(laborListingsTable.id, id))
    .returning();
  await writeAuditLog({
    actorUserId: user.id,
    action: "LABOR_LISTING_UPDATED",
    entityType: "LaborListing",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serLabor(updated));
});

router.delete("/labor/listings/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  await db.update(laborListingsTable).set({ isPublished: false, updatedAt: new Date() }).where(eq(laborListingsTable.id, id));
  await writeAuditLog({
    actorUserId: user.id,
    action: "LABOR_LISTING_DELETED",
    entityType: "LaborListing",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({ message: "Deleted" });
});

router.post("/labor/listings/:id/inquiries", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = inquiryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const [listing] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
  if (!listing) return res.status(404).json({ error: "Not found" });
  const [provider] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, listing.providerId))
    .limit(1);
  const [inq] = await db
    .insert(laborInquiriesTable)
    .values({
      listingId: id,
      providerId: listing.providerId,
      inquirerUserId: user.id,
      message: escapeHtml(parsed.data.message),
    })
    .returning();
  if (provider) {
    await createNotification({
      userId: provider.userId,
      eventType: "INQUIRY_RECEIVED",
      title: "Labor inquiry received",
      description: `Inquiry for ${listing.skillCategory}`,
      relatedType: "LaborInquiry",
      relatedId: inq.id,
      category: "MARKETPLACE",
    });
  }
  return res.status(201).json({
    ...inq,
    createdAt: inq.createdAt.toISOString(),
    updatedAt: inq.updatedAt.toISOString(),
  });
});

router.patch("/labor/inquiries/:id/respond", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const responseMessage = String(req.body?.responseMessage || "").slice(0, 2000);
  if (!responseMessage) return res.status(400).json({ error: "responseMessage required" });
  const [inq] = await db.select().from(laborInquiriesTable).where(eq(laborInquiriesTable.id, id)).limit(1);
  if (!inq) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user), inq.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  const [updated] = await db
    .update(laborInquiriesTable)
    .set({
      status: "RESPONDED",
      responseMessage: escapeHtml(responseMessage),
      updatedAt: new Date(),
    })
    .where(eq(laborInquiriesTable.id, id))
    .returning();
  await createNotification({
    userId: inq.inquirerUserId,
    eventType: "INQUIRY_RESPONDED",
    title: "Labor supplier responded",
    description: responseMessage.slice(0, 120),
    relatedType: "LaborInquiry",
    relatedId: id,
    category: "MARKETPLACE",
  });
  return res.status(200).json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// —— Logistics ——
router.post("/logistics/services", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user));
  if (!provider) return res.status(403).json({ error: "Logistics profile required" });
  const parsed = createLogisticsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const d = parsed.data;
  const [row] = await db
    .insert(logisticsServicesTable)
    .values({
      providerId: provider.id,
      serviceType: d.serviceType,
      vehicleType: d.vehicleType ?? null,
      storageType: d.storageType ?? null,
      capacity: d.capacity ?? null,
      coverageAreas: d.coverageAreas ?? null,
      pricingModel: d.pricingModel ?? null,
      minimumCharge: d.minimumCharge != null ? String(d.minimumCharge) : null,
      currency: (d.currency || "INR").toUpperCase(),
      estimatedDelivery: d.estimatedDelivery ?? null,
      insuranceAvailable: d.insuranceAvailable ?? false,
      trackingAvailable: d.trackingAvailable ?? false,
      description: d.description ? escapeHtml(d.description) : null,
    })
    .returning();
  await writeAuditLog({
    actorUserId: user.id,
    action: "LOGISTICS_SERVICE_CREATED",
    entityType: "LogisticsService",
    entityId: row.id,
    ipAddress: clientIp(req),
  });
  return res.status(201).json(serLog(row));
});

router.get("/logistics/services", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const conditions = [eq(logisticsServicesTable.isPublished, true)];
  if (req.query.serviceType) conditions.push(eq(logisticsServicesTable.serviceType, String(req.query.serviceType)));
  if (req.query.coverage) conditions.push(ilike(logisticsServicesTable.coverageAreas, `%${req.query.coverage}%`));
  if (req.query.mine === "true") {
    const user = await requireUser(req, res);
    if (!user) return;
    const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user));
    if (!provider) return res.status(200).json({ items: [], total: 0, page, limit });
    conditions.length = 0;
    conditions.push(eq(logisticsServicesTable.providerId, provider.id));
  }
  const where = and(...conditions);
  const rows = await db.select().from(logisticsServicesTable).where(where).orderBy(desc(logisticsServicesTable.updatedAt)).limit(limit).offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(logisticsServicesTable).where(where);
  return res.status(200).json({ items: rows.map(serLog), total: count, page, limit });
});

router.get("/logistics/services/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.status(200).json(serLog(row));
});

router.put("/logistics/services/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  const parsed = createLogisticsBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
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
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
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
  return res.status(200).json(serLog(updated));
});

router.delete("/logistics/services/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(logisticsServicesTable).where(eq(logisticsServicesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  await db.update(logisticsServicesTable).set({ isPublished: false, updatedAt: new Date() }).where(eq(logisticsServicesTable.id, id));
  await writeAuditLog({
    actorUserId: user.id,
    action: "LOGISTICS_SERVICE_DELETED",
    entityType: "LogisticsService",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({ message: "Deleted" });
});

router.post("/logistics/quotes", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = createQuoteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const [provider] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, parsed.data.providerId))
    .limit(1);
  if (!provider || provider.providerType !== "LOGISTICS_PROVIDER") {
    return res.status(404).json({ error: "Logistics provider not found" });
  }
  const [quote] = await db
    .insert(logisticsQuotesTable)
    .values({
      serviceId: parsed.data.serviceId ?? null,
      providerId: parsed.data.providerId,
      requestId: parsed.data.requestId ?? null,
      requesterUserId: user.id,
      pickupLocation: parsed.data.pickupLocation ?? null,
      dropLocation: parsed.data.dropLocation ?? null,
      cargoDetails: parsed.data.cargoDetails ? escapeHtml(parsed.data.cargoDetails) : null,
      requestedDate: parsed.data.requestedDate ? new Date(parsed.data.requestedDate) : null,
      status: "REQUESTED",
    })
    .returning();
  await createNotification({
    userId: provider.userId,
    eventType: "QUOTE_REQUESTED",
    title: "New logistics quote request",
    description: "A user requested a quote for your logistics service.",
    relatedType: "LogisticsQuote",
    relatedId: quote.id,
    category: "MARKETPLACE",
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: "LOGISTICS_QUOTE_REQUESTED",
    entityType: "LogisticsQuote",
    entityId: quote.id,
    ipAddress: clientIp(req),
  });
  return res.status(201).json(serQuote(quote));
});

router.get("/logistics/quotes", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const asProvider = req.query.as === "provider";
  let conditions;
  if (asProvider) {
    const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user));
    if (!provider) return res.status(200).json({ items: [], total: 0, page, limit });
    conditions = [eq(logisticsQuotesTable.providerId, provider.id)];
  } else {
    conditions = [eq(logisticsQuotesTable.requesterUserId, user.id)];
  }
  const where = and(...conditions);
  const rows = await db.select().from(logisticsQuotesTable).where(where).orderBy(desc(logisticsQuotesTable.createdAt)).limit(limit).offset((page - 1) * limit);
  return res.status(200).json({ items: rows.map(serQuote), page, limit });
});

router.patch("/logistics/quotes/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = respondQuoteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const [existing] = await db.select().from(logisticsQuotesTable).where(eq(logisticsQuotesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getOwnedProvider(user.id, "LOGISTICS_PROVIDER", isAdmin(user), existing.providerId);
  if (!provider && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  const [updated] = await db
    .update(logisticsQuotesTable)
    .set({
      quotedAmount: String(parsed.data.quotedAmount),
      providerResponse: parsed.data.providerResponse ? escapeHtml(parsed.data.providerResponse) : null,
      currency: parsed.data.currency?.toUpperCase() ?? existing.currency,
      status: parsed.data.status ?? "QUOTED",
      updatedAt: new Date(),
    })
    .where(eq(logisticsQuotesTable.id, id))
    .returning();
  await createNotification({
    userId: existing.requesterUserId,
    eventType: "QUOTE_SUBMITTED",
    title: "Logistics quote received",
    description: `Quote amount: ${updated.currency} ${updated.quotedAmount}`,
    relatedType: "LogisticsQuote",
    relatedId: id,
    category: "MARKETPLACE",
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: "LOGISTICS_QUOTE_SUBMITTED",
    entityType: "LogisticsQuote",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json(serQuote(updated));
});

export default router;
