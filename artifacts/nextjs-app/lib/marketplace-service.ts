/**
 * MVP Marketplace service — facilities, machinery, search, requests, bookings
 */

import { db } from "@/lib/db";
import {
  manufacturingFacilitiesTable,
  machineryInventoryTable,
  availabilitySlotsTable,
  manufacturingRequestsTable,
  requestMessagesTable,
  requestOffersTable,
  bookingsTable,
  listingModerationsTable,
  usersTable,
  searchAnalyticsEventsTable,
  ratingSummariesTable,
  userFavoritesTable,
  notificationsTable,
} from "@/lib/schema";
import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import type { AuthUser } from "@/lib/legal-auth";
import { createNotification, escapeHtml } from "@/lib/legal-auth";
import { parseLocation, profileCompletion } from "@/lib/marketplace-helpers";

export type SearchFilters = {
  q?: string;
  machineType?: string;
  industry?: string;
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availableOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export { parseLocation, profileCompletion };

export async function upsertFacility(
  ownerId: number,
  data: {
    id?: number;
    name: string;
    tagline?: string;
    description?: string;
    location?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    industry?: string;
    certifications?: string[];
    ownerName?: string;
    sezStatus?: string;
    serviceAreas?: string;
    infrastructure?: string;
    workingHours?: string;
    images?: string[];
    addressLine?: string;
  },
) {
  const loc = parseLocation(data.location ?? "");
  const certJson = data.certifications?.length ? JSON.stringify(data.certifications) : null;
  const payload: Record<string, unknown> = {
    name: escapeHtml(data.name),
    tagline: data.tagline ? escapeHtml(data.tagline) : null,
    description: data.description ? escapeHtml(data.description) : null,
    location: data.location ?? null,
    city: loc.city || null,
    state: loc.state || null,
    country: loc.country || null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    website: data.website ?? null,
    industry: data.industry ?? null,
    certifications: certJson,
    updatedAt: new Date(),
  };
  if (data.ownerName !== undefined) payload.ownerName = data.ownerName ? escapeHtml(data.ownerName) : null;
  if (data.sezStatus !== undefined) payload.sezStatus = data.sezStatus;
  if (data.serviceAreas !== undefined) payload.serviceAreas = data.serviceAreas;
  if (data.infrastructure !== undefined) payload.infrastructure = data.infrastructure;
  if (data.workingHours !== undefined) payload.workingHours = data.workingHours;
  if (data.images !== undefined) payload.images = data.images.length ? JSON.stringify(data.images) : null;
  if (data.addressLine !== undefined) payload.addressLine = data.addressLine;

  if (data.id) {
    const [row] = await db
      .update(manufacturingFacilitiesTable)
      .set(payload)
      .where(and(eq(manufacturingFacilitiesTable.id, data.id), eq(manufacturingFacilitiesTable.ownerUserId, ownerId)))
      .returning();
    return row ?? null;
  }

  const [row] = await db
    .insert(manufacturingFacilitiesTable)
    .values({ ...payload, ownerUserId: ownerId, status: "DRAFT" })
    .returning();
  return row;
}

export async function publishFacility(facilityId: number, ownerId: number) {
  const machines = await db
    .select()
    .from(machineryInventoryTable)
    .where(and(eq(machineryInventoryTable.facilityId, facilityId), eq(machineryInventoryTable.ownerUserId, ownerId)));
  if (machines.length === 0) throw new Error("Add at least one machine before publishing");

  const now = new Date();
  await db
    .update(machineryInventoryTable)
    .set({ status: "PENDING_REVIEW", publishedAt: now, updatedAt: now })
    .where(eq(machineryInventoryTable.facilityId, facilityId));

  const [facility] = await db
    .update(manufacturingFacilitiesTable)
    .set({ status: "PENDING_REVIEW", publishedAt: now, updatedAt: now })
    .where(and(eq(manufacturingFacilitiesTable.id, facilityId), eq(manufacturingFacilitiesTable.ownerUserId, ownerId)))
    .returning();

  for (const m of machines) {
    try {
      await db.insert(listingModerationsTable).values({
        listingType: "MACHINERY",
        listingId: m.id,
        ownerUserId: ownerId,
        title: m.name,
        status: "PENDING",
      });
    } catch {
      /* duplicate moderation row */
    }
  }
  return facility;
}

type MachineryInput = {
  name: string;
  machineType: string;
  description?: string;
  quantity?: number;
  pricePerHour?: string | number;
  currency?: string;
  pricingModel?: string;
  pricePerDay?: string | number;
  pricePerWeek?: string | number;
  pricePerMonth?: string | number;
  pricePerUnit?: string | number;
  pricePerBatch?: string | number;
  extraServiceCharges?: string;
  subcategory?: string;
  condition?: string;
  ageYears?: number;
  technicalSpecs?: string;
  serviceCostNotes?: string;
  imageUrl?: string;
  imageFileId?: number;
  keywords?: string[];
  capacityNotes?: string;
  slots?: {
    date: string;
    startTime: string;
    endTime: string;
    price?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    notes?: string;
  }[];
};

function numOrNull(v?: string | number) {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

export async function addMachinery(ownerId: number, facilityId: number, data: MachineryInput) {
  const [owned] = await db
    .select()
    .from(manufacturingFacilitiesTable)
    .where(
      and(eq(manufacturingFacilitiesTable.id, facilityId), eq(manufacturingFacilitiesTable.ownerUserId, ownerId)),
    )
    .limit(1);
  if (!owned) throw new Error("Facility not found");

  const [machine] = await db
    .insert(machineryInventoryTable)
    .values({
      facilityId,
      ownerUserId: ownerId,
      name: escapeHtml(data.name),
      machineType: data.machineType,
      description: data.description ? escapeHtml(data.description) : null,
      quantity: data.quantity ?? 1,
      pricePerHour: String(data.pricePerHour ?? 0),
      currency: data.currency ?? "USD",
      pricingModel: data.pricingModel ?? "HOURLY",
      pricePerDay: numOrNull(data.pricePerDay),
      pricePerWeek: numOrNull(data.pricePerWeek),
      pricePerMonth: numOrNull(data.pricePerMonth),
      pricePerUnit: numOrNull(data.pricePerUnit),
      pricePerBatch: numOrNull(data.pricePerBatch),
      extraServiceCharges: data.extraServiceCharges ?? null,
      subcategory: data.subcategory ?? null,
      condition: data.condition ?? null,
      ageYears: data.ageYears ?? null,
      technicalSpecs: data.technicalSpecs ?? null,
      serviceCostNotes: data.serviceCostNotes ?? null,
      imageUrl: data.imageUrl ?? null,
      imageFileId: data.imageFileId ?? null,
      keywords: data.keywords?.join(",") ?? null,
      capacityNotes: data.capacityNotes ?? null,
      status: "DRAFT",
    })
    .returning();

  if (data.slots?.length) {
    await db.insert(availabilitySlotsTable).values(
      data.slots.map((s) => ({
        inventoryId: machine.id,
        facilityId,
        ownerUserId: ownerId,
        slotDate: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        priceOverride: s.price ? String(s.price) : null,
        isRecurring: s.isRecurring ?? false,
        recurrenceRule: s.recurrenceRule ?? null,
        notes: s.notes ?? null,
        status: "AVAILABLE",
      })),
    );
  }
  return machine;
}

export async function updateMachinery(ownerId: number, machineId: number, data: Partial<MachineryInput>) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = escapeHtml(data.name);
  if (data.machineType !== undefined) patch.machineType = data.machineType;
  if (data.description !== undefined) patch.description = data.description ? escapeHtml(data.description) : null;
  if (data.quantity !== undefined) patch.quantity = data.quantity;
  if (data.pricePerHour !== undefined) patch.pricePerHour = String(data.pricePerHour);
  if (data.currency !== undefined) patch.currency = data.currency;
  if (data.pricingModel !== undefined) patch.pricingModel = data.pricingModel;
  if (data.pricePerDay !== undefined) patch.pricePerDay = numOrNull(data.pricePerDay);
  if (data.pricePerWeek !== undefined) patch.pricePerWeek = numOrNull(data.pricePerWeek);
  if (data.pricePerMonth !== undefined) patch.pricePerMonth = numOrNull(data.pricePerMonth);
  if (data.pricePerUnit !== undefined) patch.pricePerUnit = numOrNull(data.pricePerUnit);
  if (data.pricePerBatch !== undefined) patch.pricePerBatch = numOrNull(data.pricePerBatch);
  if (data.extraServiceCharges !== undefined) patch.extraServiceCharges = data.extraServiceCharges;
  if (data.subcategory !== undefined) patch.subcategory = data.subcategory;
  if (data.condition !== undefined) patch.condition = data.condition;
  if (data.ageYears !== undefined) patch.ageYears = data.ageYears;
  if (data.technicalSpecs !== undefined) patch.technicalSpecs = data.technicalSpecs;
  if (data.serviceCostNotes !== undefined) patch.serviceCostNotes = data.serviceCostNotes;
  if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
  if (data.imageFileId !== undefined) patch.imageFileId = data.imageFileId;
  if (data.keywords !== undefined) patch.keywords = data.keywords?.join(",") ?? null;
  if (data.capacityNotes !== undefined) patch.capacityNotes = data.capacityNotes;

  const [row] = await db
    .update(machineryInventoryTable)
    .set(patch)
    .where(and(eq(machineryInventoryTable.id, machineId), eq(machineryInventoryTable.ownerUserId, ownerId)))
    .returning();
  return row ?? null;
}

export async function listAvailability(ownerId: number, inventoryId?: number) {
  const conditions = [eq(availabilitySlotsTable.ownerUserId, ownerId)];
  if (inventoryId) conditions.push(eq(availabilitySlotsTable.inventoryId, inventoryId));
  return db
    .select()
    .from(availabilitySlotsTable)
    .where(and(...conditions))
    .orderBy(desc(availabilitySlotsTable.slotDate));
}

export async function upsertAvailabilitySlot(
  ownerId: number,
  data: {
    id?: number;
    inventoryId: number;
    slotDate: string;
    startTime: string;
    endTime: string;
    priceOverride?: string;
    status?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    notes?: string;
  },
) {
  const [machine] = await db
    .select()
    .from(machineryInventoryTable)
    .where(and(eq(machineryInventoryTable.id, data.inventoryId), eq(machineryInventoryTable.ownerUserId, ownerId)))
    .limit(1);
  if (!machine) return null;

  const payload = {
    inventoryId: data.inventoryId,
    facilityId: machine.facilityId,
    ownerUserId: ownerId,
    slotDate: data.slotDate,
    startTime: data.startTime,
    endTime: data.endTime,
    priceOverride: data.priceOverride ?? null,
    status: data.status ?? "AVAILABLE",
    isRecurring: data.isRecurring ?? false,
    recurrenceRule: data.recurrenceRule ?? null,
    notes: data.notes ?? null,
    updatedAt: new Date(),
  };

  if (data.id) {
    const [row] = await db
      .update(availabilitySlotsTable)
      .set(payload)
      .where(and(eq(availabilitySlotsTable.id, data.id), eq(availabilitySlotsTable.ownerUserId, ownerId)))
      .returning();
    return row ?? null;
  }

  const [row] = await db.insert(availabilitySlotsTable).values(payload).returning();
  return row;
}

export async function deleteAvailabilitySlot(ownerId: number, slotId: number) {
  const [row] = await db
    .delete(availabilitySlotsTable)
    .where(and(eq(availabilitySlotsTable.id, slotId), eq(availabilitySlotsTable.ownerUserId, ownerId)))
    .returning();
  return row ?? null;
}

export async function searchManufacturers(filters: SearchFilters, viewerUserId?: number) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 50);
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(manufacturingFacilitiesTable.status, "PUBLISHED"),
    eq(machineryInventoryTable.status, "PUBLISHED"),
  ];

  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(manufacturingFacilitiesTable.name, q),
        ilike(manufacturingFacilitiesTable.tagline, q),
        ilike(manufacturingFacilitiesTable.location, q),
        ilike(machineryInventoryTable.name, q),
        ilike(machineryInventoryTable.machineType, q),
        ilike(machineryInventoryTable.keywords, q),
      )!,
    );
  }
  if (filters.machineType && filters.machineType !== "All Machines") {
    conditions.push(ilike(machineryInventoryTable.machineType, `%${filters.machineType}%`));
  }
  if (filters.industry) conditions.push(eq(manufacturingFacilitiesTable.industry, filters.industry));
  if (filters.city) conditions.push(ilike(manufacturingFacilitiesTable.city, `%${filters.city}%`));
  if (filters.country) conditions.push(ilike(manufacturingFacilitiesTable.country, `%${filters.country}%`));
  if (filters.minPrice != null) {
    conditions.push(gte(machineryInventoryTable.pricePerHour, String(filters.minPrice)));
  }

  const rows = await db
    .select({
      facility: manufacturingFacilitiesTable,
      machine: machineryInventoryTable,
      owner: usersTable,
    })
    .from(manufacturingFacilitiesTable)
    .innerJoin(machineryInventoryTable, eq(machineryInventoryTable.facilityId, manufacturingFacilitiesTable.id))
    .innerJoin(usersTable, eq(usersTable.id, manufacturingFacilitiesTable.ownerUserId))
    .where(and(...conditions))
    .orderBy(desc(manufacturingFacilitiesTable.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const facilityIds = [...new Set(rows.map((r) => r.facility.id))];
  const ratings =
    facilityIds.length > 0
      ? await db
          .select()
          .from(ratingSummariesTable)
          .where(
            and(
              eq(ratingSummariesTable.entityType, "MANUFACTURING_FACILITY"),
              inArray(ratingSummariesTable.entityId, facilityIds),
            ),
          )
      : [];

  const ratingMap = new Map(ratings.map((r) => [r.entityId, r]));

  const results = rows.map((r) => {
    const rating = ratingMap.get(r.facility.id);
    return {
      facilityId: r.facility.id,
      machineId: r.machine.id,
      manufacturerUserId: r.facility.ownerUserId,
      name: r.facility.name,
      tagline: r.facility.tagline,
      location: r.facility.location ?? [r.facility.city, r.facility.state, r.facility.country].filter(Boolean).join(", "),
      industry: r.facility.industry,
      machineName: r.machine.name,
      machineType: r.machine.machineType,
      pricePerHour: Number(r.machine.pricePerHour),
      currency: r.machine.currency,
      imageUrl: r.machine.imageUrl,
      rating: rating ? Number(rating.averageRating) : 0,
      reviewCount: rating?.reviewCount ?? 0,
      verified: r.owner.identityVerificationStatus === "VERIFIED",
    };
  });

  if (viewerUserId || filters.q) {
    try {
      await db.insert(searchAnalyticsEventsTable).values({
        userId: viewerUserId ?? null,
        query: filters.q ?? null,
        category: filters.machineType ?? null,
        city: filters.city ?? null,
        country: filters.country ?? null,
        resultCount: results.length,
        source: "MANUFACTURER_SEARCH",
      });
    } catch {
      /* non-blocking */
    }
  }

  return { data: results, pagination: { page, pageSize, total: results.length } };
}

export async function getFacilityDetail(facilityId: number) {
  const [facility] = await db
    .select()
    .from(manufacturingFacilitiesTable)
    .where(eq(manufacturingFacilitiesTable.id, facilityId))
    .limit(1);
  if (!facility) return null;

  const machines = await db
    .select()
    .from(machineryInventoryTable)
    .where(eq(machineryInventoryTable.facilityId, facilityId));

  const machineIds = machines.map((m) => m.id);
  const slots =
    machineIds.length > 0
      ? await db
          .select()
          .from(availabilitySlotsTable)
          .where(
            and(
              inArray(availabilitySlotsTable.inventoryId, machineIds),
              eq(availabilitySlotsTable.status, "AVAILABLE"),
              gte(availabilitySlotsTable.slotDate, sql`CURRENT_DATE`),
            ),
          )
      : [];

  const [rating] = await db
    .select()
    .from(ratingSummariesTable)
    .where(
      and(
        eq(ratingSummariesTable.entityType, "MANUFACTURING_FACILITY"),
        eq(ratingSummariesTable.entityId, facilityId),
      ),
    )
    .limit(1);

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, facility.ownerUserId)).limit(1);

  return { facility, machines, slots, rating, owner };
}

export async function createRequirement(
  visionaryId: number,
  data: {
    title: string;
    description?: string;
    industry?: string;
    category?: string;
    city?: string;
    state?: string;
    country?: string;
    budgetMin?: string;
    budgetMax?: string;
    materialSpecs?: string;
    status?: string;
    isConfidential?: boolean;
    requiredMachinery?: string;
    requiredLabor?: string;
    requiredMaterials?: string;
    requiredLogistics?: string;
    requiredLegal?: string;
    timelineNotes?: string;
    attachmentFileIds?: number[];
  },
) {
  const [row] = await db
    .insert(manufacturingRequestsTable)
    .values({
      visionaryUserId: visionaryId,
      title: escapeHtml(data.title),
      description: data.description ? escapeHtml(data.description) : null,
      industry: data.industry ?? null,
      category: data.category ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
      materialSpecs: data.materialSpecs ?? null,
      isConfidential: data.isConfidential ?? false,
      requiredMachinery: data.requiredMachinery ?? null,
      requiredLabor: data.requiredLabor ?? null,
      requiredMaterials: data.requiredMaterials ?? null,
      requiredLogistics: data.requiredLogistics ?? null,
      requiredLegal: data.requiredLegal ?? null,
      timelineNotes: data.timelineNotes ?? null,
      attachmentFileIds: data.attachmentFileIds?.length ? JSON.stringify(data.attachmentFileIds) : null,
      requestType: "REQUIREMENT",
      status: data.status ?? "DRAFT",
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    })
    .returning();
  return row;
}

export async function submitListingRequest(
  visionary: AuthUser,
  data: {
    facilityId: number;
    inventoryId: number;
    manufacturerUserId: number;
    title: string;
    message?: string;
    quantity?: number;
    preferredStartDate?: string;
    preferredEndDate?: string;
    slotIds?: number[];
  },
) {
  const [row] = await db
    .insert(manufacturingRequestsTable)
    .values({
      visionaryUserId: visionary.id,
      manufacturerUserId: data.manufacturerUserId,
      facilityId: data.facilityId,
      inventoryId: data.inventoryId,
      title: escapeHtml(data.title),
      message: data.message ? escapeHtml(data.message) : null,
      quantity: data.quantity ?? 1,
      preferredStartDate: data.preferredStartDate ? new Date(data.preferredStartDate) : null,
      preferredEndDate: data.preferredEndDate ? new Date(data.preferredEndDate) : null,
      requestType: "LISTING_REQUEST",
      status: "PENDING",
    })
    .returning();

  if (data.slotIds?.length) {
    const holdUntil = new Date(Date.now() + 30 * 60 * 1000);
    await db
      .update(availabilitySlotsTable)
      .set({ status: "RESERVED", reservedUntil: holdUntil, requestId: row.id, updatedAt: new Date() })
      .where(
        and(
          inArray(availabilitySlotsTable.id, data.slotIds),
          eq(availabilitySlotsTable.status, "AVAILABLE"),
        ),
      );
  }

  await createNotification({
    userId: data.manufacturerUserId,
    eventType: "REQUEST_RECEIVED",
    title: "New manufacturing request",
    description: `${visionary.name} submitted a request: ${data.title}`,
    relatedType: "ManufacturingRequest",
    relatedId: row.id,
    category: "BOOKING",
  });

  return row;
}

export async function respondToRequest(
  manufacturerId: number,
  requestId: number,
  action: "ACCEPT" | "DECLINE",
  declineReason?: string,
) {
  const [req] = await db
    .select()
    .from(manufacturingRequestsTable)
    .where(
      and(
        eq(manufacturingRequestsTable.id, requestId),
        eq(manufacturingRequestsTable.manufacturerUserId, manufacturerId),
        inArray(manufacturingRequestsTable.status, ["PENDING", "COUNTERED"]),
      ),
    )
    .limit(1);
  if (!req) return null;

  if (action === "DECLINE") {
    const [updated] = await db
      .update(manufacturingRequestsTable)
      .set({
        status: "DECLINED",
        declineReason: declineReason ? escapeHtml(declineReason) : null,
        updatedAt: new Date(),
      })
      .where(eq(manufacturingRequestsTable.id, requestId))
      .returning();
    await db
      .update(availabilitySlotsTable)
      .set({ status: "AVAILABLE", reservedUntil: null, requestId: null, updatedAt: new Date() })
      .where(eq(availabilitySlotsTable.requestId, requestId));
    await createNotification({
      userId: req.visionaryUserId,
      eventType: "REQUEST_DECLINED",
      title: "Request declined",
      description: `Your request "${req.title}" was declined.`,
      relatedType: "ManufacturingRequest",
      relatedId: requestId,
      category: "BOOKING",
    });
    return { request: updated, booking: null };
  }

  // Atomic accept + booking + slot lock (prevents double-booking races)
  const result = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(manufacturingRequestsTable)
      .where(
        and(
          eq(manufacturingRequestsTable.id, requestId),
          inArray(manufacturingRequestsTable.status, ["PENDING", "COUNTERED"]),
        ),
      )
      .limit(1);
    if (!locked) return null;

    const reference = `XY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [booking] = await tx
      .insert(bookingsTable)
      .values({
        reference,
        visionaryUserId: locked.visionaryUserId,
        manufacturerUserId: manufacturerId,
        facilityId: locked.facilityId,
        inventoryId: locked.inventoryId,
        requestId: locked.id,
        status: "CONFIRMED",
        startDate: locked.preferredStartDate,
        endDate: locked.preferredEndDate,
        notes: locked.message,
      })
      .returning();

    const [updated] = await tx
      .update(manufacturingRequestsTable)
      .set({ status: "ACCEPTED", bookingId: booking.id, updatedAt: new Date() })
      .where(
        and(
          eq(manufacturingRequestsTable.id, requestId),
          inArray(manufacturingRequestsTable.status, ["PENDING", "COUNTERED"]),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("CONFLICT_DOUBLE_ACCEPT");
    }

    await tx
      .update(availabilitySlotsTable)
      .set({ status: "BOOKED", updatedAt: new Date() })
      .where(eq(availabilitySlotsTable.requestId, requestId));

    return { request: updated, booking, reference };
  });

  if (!result) return null;

  await createNotification({
    userId: req.visionaryUserId,
    eventType: "REQUEST_ACCEPTED",
    title: "Request accepted — booking confirmed",
    description: `Booking ${result.reference} has been created.`,
    relatedType: "Booking",
    relatedId: result.booking.id,
    category: "BOOKING",
  });

  return { request: result.request, booking: result.booking };
}

export async function listRequestMessages(requestId: number, userId: number) {
  const [req] = await db
    .select()
    .from(manufacturingRequestsTable)
    .where(eq(manufacturingRequestsTable.id, requestId))
    .limit(1);
  if (!req) return null;
  if (req.visionaryUserId !== userId && req.manufacturerUserId !== userId) return "FORBIDDEN" as const;

  const messages = await db
    .select()
    .from(requestMessagesTable)
    .where(eq(requestMessagesTable.requestId, requestId))
    .orderBy(requestMessagesTable.createdAt);
  return { request: req, messages };
}

export async function postRequestMessage(requestId: number, senderId: number, body: string) {
  const access = await listRequestMessages(requestId, senderId);
  if (!access || access === "FORBIDDEN") return access;

  const [msg] = await db
    .insert(requestMessagesTable)
    .values({
      requestId,
      senderUserId: senderId,
      body: escapeHtml(body),
    })
    .returning();

  const recipient =
    access.request.visionaryUserId === senderId
      ? access.request.manufacturerUserId
      : access.request.visionaryUserId;
  if (recipient) {
    await createNotification({
      userId: recipient,
      eventType: "REQUEST_MESSAGE",
      title: "New message on your request",
      description: body.slice(0, 120),
      relatedType: "ManufacturingRequest",
      relatedId: requestId,
      category: "MESSAGING",
    });
  }
  return msg;
}

export async function createCounterOffer(
  userId: number,
  requestId: number,
  data: {
    proposedPrice?: string | number;
    currency?: string;
    proposedStartDate?: string;
    proposedEndDate?: string;
    proposedQuantity?: number;
    terms?: string;
    parentOfferId?: number;
  },
) {
  const [req] = await db
    .select()
    .from(manufacturingRequestsTable)
    .where(eq(manufacturingRequestsTable.id, requestId))
    .limit(1);
  if (!req) return null;
  if (req.visionaryUserId !== userId && req.manufacturerUserId !== userId) return "FORBIDDEN" as const;

  const [offer] = await db
    .insert(requestOffersTable)
    .values({
      requestId,
      offeredByUserId: userId,
      offerType: "COUNTER",
      proposedPrice: data.proposedPrice != null ? String(data.proposedPrice) : null,
      currency: data.currency ?? "USD",
      proposedStartDate: data.proposedStartDate ? new Date(data.proposedStartDate) : null,
      proposedEndDate: data.proposedEndDate ? new Date(data.proposedEndDate) : null,
      proposedQuantity: data.proposedQuantity ?? null,
      terms: data.terms ? escapeHtml(data.terms) : null,
      parentOfferId: data.parentOfferId ?? null,
      status: "PENDING",
    })
    .returning();

  await db
    .update(manufacturingRequestsTable)
    .set({ status: "COUNTERED", updatedAt: new Date() })
    .where(eq(manufacturingRequestsTable.id, requestId));

  const recipient = req.visionaryUserId === userId ? req.manufacturerUserId : req.visionaryUserId;
  if (recipient) {
    await createNotification({
      userId: recipient,
      eventType: "COUNTER_OFFER",
      title: "New counter-offer",
      description: `A counter-offer was submitted on "${req.title}".`,
      relatedType: "ManufacturingRequest",
      relatedId: requestId,
      category: "BOOKING",
    });
  }
  return offer;
}

export async function listOffers(requestId: number, userId: number) {
  const access = await listRequestMessages(requestId, userId);
  if (!access || access === "FORBIDDEN") return access;
  const offers = await db
    .select()
    .from(requestOffersTable)
    .where(eq(requestOffersTable.requestId, requestId))
    .orderBy(desc(requestOffersTable.createdAt));
  return { request: access.request, offers };
}

export async function respondToOffer(
  userId: number,
  offerId: number,
  action: "ACCEPT" | "REJECT",
) {
  const [offer] = await db
    .select()
    .from(requestOffersTable)
    .where(and(eq(requestOffersTable.id, offerId), eq(requestOffersTable.status, "PENDING")))
    .limit(1);
  if (!offer) return null;

  const [req] = await db
    .select()
    .from(manufacturingRequestsTable)
    .where(eq(manufacturingRequestsTable.id, offer.requestId))
    .limit(1);
  if (!req) return null;
  if (req.visionaryUserId !== userId && req.manufacturerUserId !== userId) return "FORBIDDEN" as const;
  if (offer.offeredByUserId === userId) return "FORBIDDEN" as const;

  if (action === "REJECT") {
    const [updated] = await db
      .update(requestOffersTable)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(eq(requestOffersTable.id, offerId))
      .returning();
    await createNotification({
      userId: offer.offeredByUserId,
      eventType: "COUNTER_OFFER_REJECTED",
      title: "Counter-offer rejected",
      description: `Your counter-offer on "${req.title}" was rejected.`,
      relatedType: "ManufacturingRequest",
      relatedId: req.id,
      category: "BOOKING",
    });
    return { offer: updated, booking: null };
  }

  await db
    .update(requestOffersTable)
    .set({ status: "ACCEPTED", updatedAt: new Date() })
    .where(eq(requestOffersTable.id, offerId));

  const patch: Record<string, unknown> = {
    status: "ACCEPTED",
    updatedAt: new Date(),
  };
  if (offer.proposedPrice) patch.budgetMax = String(offer.proposedPrice);
  if (offer.proposedStartDate) patch.preferredStartDate = offer.proposedStartDate;
  if (offer.proposedEndDate) patch.preferredEndDate = offer.proposedEndDate;
  if (offer.proposedQuantity) patch.quantity = offer.proposedQuantity;

  const [updatedReq] = await db
    .update(manufacturingRequestsTable)
    .set(patch)
    .where(eq(manufacturingRequestsTable.id, req.id))
    .returning();

  let booking = null;
  if (req.manufacturerUserId && req.requestType === "LISTING_REQUEST") {
    const reference = `XY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [created] = await db
      .insert(bookingsTable)
      .values({
        reference,
        visionaryUserId: req.visionaryUserId,
        manufacturerUserId: req.manufacturerUserId,
        facilityId: req.facilityId,
        inventoryId: req.inventoryId,
        requestId: req.id,
        status: "CONFIRMED",
        startDate: offer.proposedStartDate ?? req.preferredStartDate,
        endDate: offer.proposedEndDate ?? req.preferredEndDate,
        notes: offer.terms ?? req.message,
      })
      .returning();
    booking = created;
    await db
      .update(manufacturingRequestsTable)
      .set({ bookingId: created.id, updatedAt: new Date() })
      .where(eq(manufacturingRequestsTable.id, req.id));
    await db
      .update(availabilitySlotsTable)
      .set({ status: "BOOKED", updatedAt: new Date() })
      .where(eq(availabilitySlotsTable.requestId, req.id));
  }

  await createNotification({
    userId: offer.offeredByUserId,
    eventType: "COUNTER_OFFER_ACCEPTED",
    title: "Counter-offer accepted",
    description: booking
      ? `Counter-offer accepted. Booking ${booking.reference} created.`
      : `Your counter-offer on "${req.title}" was accepted.`,
    relatedType: booking ? "Booking" : "ManufacturingRequest",
    relatedId: booking?.id ?? req.id,
    category: "BOOKING",
  });

  return { offer, request: updatedReq, booking };
}

export async function listFavorites(userId: number) {
  return db
    .select()
    .from(userFavoritesTable)
    .where(eq(userFavoritesTable.userId, userId))
    .orderBy(desc(userFavoritesTable.createdAt));
}

export async function addFavorite(
  userId: number,
  data: { entityType: string; entityId: number; title?: string },
) {
  try {
    const [row] = await db
      .insert(userFavoritesTable)
      .values({
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title ? escapeHtml(data.title) : null,
      })
      .returning();
    return row;
  } catch {
    const [existing] = await db
      .select()
      .from(userFavoritesTable)
      .where(
        and(
          eq(userFavoritesTable.userId, userId),
          eq(userFavoritesTable.entityType, data.entityType),
          eq(userFavoritesTable.entityId, data.entityId),
        ),
      )
      .limit(1);
    return existing ?? null;
  }
}

export async function removeFavorite(userId: number, favoriteId: number) {
  const [row] = await db
    .delete(userFavoritesTable)
    .where(and(eq(userFavoritesTable.id, favoriteId), eq(userFavoritesTable.userId, userId)))
    .returning();
  return row ?? null;
}

export async function markNotificationsRead(userId: number, ids?: number[]) {
  const now = new Date();
  if (ids?.length) {
    await db
      .update(notificationsTable)
      .set({ status: "READ", readAt: now })
      .where(and(eq(notificationsTable.userId, userId), inArray(notificationsTable.id, ids)));
  } else {
    await db
      .update(notificationsTable)
      .set({ status: "READ", readAt: now })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.status, "UNREAD")));
  }
  return { ok: true };
}
