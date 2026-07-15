import { Router } from "express";
import {
  db,
  bookingsTable,
  bookingLegalDocumentsTable,
  agreementAcceptancesTable,
  contractTemplatesTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
  PRODUCTION_BLOCKED_STATUSES,
} from "../lib/auth";
import {
  attachLegalDocumentBody,
  acceptAgreementBody,
  createBookingStubBody,
} from "../lib/legal-schemas";

const router = Router();

function serializeBooking(b: typeof bookingsTable.$inferSelect) {
  return {
    id: b.id,
    reference: b.reference,
    visionaryUserId: b.visionaryUserId,
    manufacturerUserId: b.manufacturerUserId,
    facilityId: b.facilityId,
    inventoryId: b.inventoryId,
    requestId: b.requestId,
    status: b.status,
    agreedPrice: b.agreedPrice,
    currency: b.currency,
    startDate: b.startDate?.toISOString() ?? null,
    endDate: b.endDate?.toISOString() ?? null,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function serializeDoc(
  d: typeof bookingLegalDocumentsTable.$inferSelect,
  acceptances: (typeof agreementAcceptancesTable.$inferSelect)[] = [],
) {
  return {
    id: d.id,
    bookingId: d.bookingId,
    templateId: d.templateId,
    documentTitle: d.documentTitle,
    documentUrl: d.documentUrl,
    documentContent: d.documentContent,
    version: d.version,
    status: d.status,
    requiresAcceptance: d.requiresAcceptance,
    requiredPartyRoles: d.requiredPartyRoles,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    acceptances: acceptances.map((a) => ({
      id: a.id,
      userId: a.userId,
      accepted: a.accepted,
      acceptedAt: a.acceptedAt.toISOString(),
      acceptedIp: a.acceptedIp,
      acceptedUserAgent: a.acceptedUserAgent,
      digitalSignature: a.digitalSignature,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

async function canAccessBooking(
  userId: number,
  booking: typeof bookingsTable.$inferSelect,
  admin: boolean,
) {
  return admin || booking.visionaryUserId === userId || booking.manufacturerUserId === userId;
}

export async function bookingHasPendingRequiredAgreements(bookingId: number): Promise<boolean> {
  const docs = await db
    .select()
    .from(bookingLegalDocumentsTable)
    .where(
      and(
        eq(bookingLegalDocumentsTable.bookingId, bookingId),
        eq(bookingLegalDocumentsTable.requiresAcceptance, true),
      ),
    );

  if (docs.length === 0) return false;

  const booking = (
    await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1)
  )[0];
  if (!booking) return true;

  const requiredUserIds = [booking.visionaryUserId, booking.manufacturerUserId];

  for (const doc of docs) {
    const acceptances = await db
      .select()
      .from(agreementAcceptancesTable)
      .where(eq(agreementAcceptancesTable.bookingLegalDocumentId, doc.id));
    const acceptedUserIds = new Set(acceptances.filter((a) => a.accepted).map((a) => a.userId));
    for (const uid of requiredUserIds) {
      if (!acceptedUserIds.has(uid)) return true;
    }
  }
  return false;
}

router.post("/bookings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = createBookingStubBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const data = parsed.data;
  const reference = `XY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      reference,
      visionaryUserId: user.id,
      manufacturerUserId: data.manufacturerUserId,
      facilityId: data.facilityId ?? null,
      inventoryId: data.inventoryId ?? null,
      status: "CONFIRMED",
      agreedPrice: data.agreedPrice != null ? String(data.agreedPrice) : null,
      currency: data.currency ?? "INR",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes ? escapeHtml(data.notes) : null,
    })
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "BOOKING_CREATED",
    entityType: "Booking",
    entityId: booking.id,
    ipAddress: clientIp(req),
  });

  await createNotification({
    userId: data.manufacturerUserId,
    eventType: "BOOKING_CONFIRMED",
    title: "New booking confirmed",
    description: `Booking ${reference} was created.`,
    relatedType: "Booking",
    relatedId: booking.id,
    category: "BOOKING",
  });

  return res.status(201).json(serializeBooking(booking));
});

router.get("/bookings/me", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const rows = await db
    .select()
    .from(bookingsTable)
    .where(
      // drizzle or() with eq
      eq(bookingsTable.visionaryUserId, user.id),
    );

  const asManufacturer = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.manufacturerUserId, user.id));

  const map = new Map<number, typeof bookingsTable.$inferSelect>();
  for (const b of [...rows, ...asManufacturer]) map.set(b.id, b);

  return res.status(200).json({ items: [...map.values()].map(serializeBooking) });
});

router.get("/bookings/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const pendingRequired = await bookingHasPendingRequiredAgreements(id);
  return res.status(200).json({
    ...serializeBooking(booking),
    agreementsComplete: !pendingRequired,
    canEnterProduction: !pendingRequired,
  });
});

router.get("/bookings/:id/legal-documents", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const docs = await db
    .select()
    .from(bookingLegalDocumentsTable)
    .where(eq(bookingLegalDocumentsTable.bookingId, id));

  const docIds = docs.map((d) => d.id);
  const acceptances =
    docIds.length > 0
      ? await db
          .select()
          .from(agreementAcceptancesTable)
          .where(inArray(agreementAcceptancesTable.bookingLegalDocumentId, docIds))
      : [];

  const pendingRequired = await bookingHasPendingRequiredAgreements(id);

  return res.status(200).json({
    items: docs.map((d) =>
      serializeDoc(
        d,
        acceptances.filter((a) => a.bookingLegalDocumentId === d.id),
      ),
    ),
    agreementsComplete: !pendingRequired,
    blockingMessage: pendingRequired
      ? "All required parties must accept legal agreements before production can begin."
      : null,
  });
});

router.post("/bookings/:id/legal-documents", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = attachLegalDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const data = parsed.data;
  let content = data.documentContent ?? null;
  let version = data.version ?? 1;
  let title = escapeHtml(data.documentTitle);

  if (data.templateId) {
    const [template] = await db
      .select()
      .from(contractTemplatesTable)
      .where(eq(contractTemplatesTable.id, data.templateId))
      .limit(1);
    if (!template || !template.isActive) {
      return res.status(404).json({ error: "Template not found or inactive" });
    }
    content = content ?? template.templateContent;
    version = template.version;
    if (!data.documentTitle) title = template.title;
  }

  const [doc] = await db
    .insert(bookingLegalDocumentsTable)
    .values({
      bookingId: id,
      templateId: data.templateId ?? null,
      documentTitle: title,
      documentUrl: data.documentUrl ?? null,
      documentContent: content,
      version,
      status: "PENDING",
      requiresAcceptance: data.requiresAcceptance ?? true,
      requiredPartyRoles: data.requiredPartyRoles ?? "VISIONARY,MANUFACTURER",
      createdBy: user.id,
    })
    .returning();

  await writeAuditLog({
    actorUserId: user.id,
    action: "AGREEMENT_ATTACHED",
    entityType: "BookingLegalDocument",
    entityId: doc.id,
    metadata: { bookingId: id },
    ipAddress: clientIp(req),
  });

  const recipients = [booking.visionaryUserId, booking.manufacturerUserId].filter(
    (uid) => uid !== user.id,
  );
  for (const uid of recipients) {
    await createNotification({
      userId: uid,
      eventType: "CONTRACT_ATTACHED",
      title: "Legal agreement attached",
      description: `"${doc.documentTitle}" was added to booking ${booking.reference}. Acceptance may be required.`,
      relatedType: "Booking",
      relatedId: booking.id,
    });
    await createNotification({
      userId: uid,
      eventType: "AGREEMENT_PENDING",
      title: "Agreement pending acceptance",
      description: `Please review and accept "${doc.documentTitle}".`,
      relatedType: "BookingLegalDocument",
      relatedId: doc.id,
    });
  }

  return res.status(201).json(serializeDoc(doc, []));
});

router.get("/legal-documents/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [doc] = await db
    .select()
    .from(bookingLegalDocumentsTable)
    .where(eq(bookingLegalDocumentsTable.id, id))
    .limit(1);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, doc.bookingId))
    .limit(1);
  if (!booking || !(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const acceptances = await db
    .select()
    .from(agreementAcceptancesTable)
    .where(eq(agreementAcceptancesTable.bookingLegalDocumentId, id));

  return res.status(200).json(serializeDoc(doc, acceptances));
});

router.post("/legal-documents/:id/accept", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = acceptAgreementBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [doc] = await db
    .select()
    .from(bookingLegalDocumentsTable)
    .where(eq(bookingLegalDocumentsTable.id, id))
    .limit(1);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, doc.bookingId))
    .limit(1);
  if (!booking || !(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const existing = await db
    .select()
    .from(agreementAcceptancesTable)
    .where(
      and(
        eq(agreementAcceptancesTable.bookingLegalDocumentId, id),
        eq(agreementAcceptancesTable.userId, user.id),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Agreement already accepted by this user" });
  }

  const [acceptance] = await db
    .insert(agreementAcceptancesTable)
    .values({
      bookingLegalDocumentId: id,
      userId: user.id,
      accepted: true,
      acceptedAt: new Date(),
      acceptedIp: clientIp(req),
      acceptedUserAgent: String(req.headers["user-agent"] ?? "").slice(0, 1000),
      digitalSignature: escapeHtml(parsed.data.digitalSignature),
    })
    .returning();

  const pending = await bookingHasPendingRequiredAgreements(booking.id);
  if (!pending) {
    await db
      .update(bookingLegalDocumentsTable)
      .set({ status: "ACCEPTED", updatedAt: new Date() })
      .where(eq(bookingLegalDocumentsTable.bookingId, booking.id));
  } else {
    await db
      .update(bookingLegalDocumentsTable)
      .set({ status: "PARTIALLY_ACCEPTED", updatedAt: new Date() })
      .where(eq(bookingLegalDocumentsTable.id, id));
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "AGREEMENT_ACCEPTED",
    entityType: "AgreementAcceptance",
    entityId: acceptance.id,
    metadata: { documentId: id, bookingId: booking.id },
    ipAddress: clientIp(req),
  });

  for (const uid of [booking.visionaryUserId, booking.manufacturerUserId]) {
    if (uid === user.id) continue;
    await createNotification({
      userId: uid,
      eventType: "AGREEMENT_ACCEPTED",
      title: "Agreement accepted",
      description: `${user.name} accepted "${doc.documentTitle}".`,
      relatedType: "Booking",
      relatedId: booking.id,
    });
  }

  return res.status(201).json({
    acceptance: {
      id: acceptance.id,
      bookingLegalDocumentId: acceptance.bookingLegalDocumentId,
      userId: acceptance.userId,
      accepted: acceptance.accepted,
      acceptedAt: acceptance.acceptedAt.toISOString(),
      acceptedIp: acceptance.acceptedIp,
      acceptedUserAgent: acceptance.acceptedUserAgent,
      digitalSignature: acceptance.digitalSignature,
    },
    agreementsComplete: !pending,
  });
});

router.post("/bookings/:id/production/start", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const pending = await bookingHasPendingRequiredAgreements(id);
  if (pending) {
    return res.status(403).json({
      error: "PROFILE_INCOMPLETE",
      message: "Required legal agreements must be accepted before production can start.",
      code: "AGREEMENTS_PENDING",
    });
  }

  if (booking.status === "DISPUTED") {
    return res.status(409).json({ error: "Booking is disputed" });
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "IN_PRODUCTION", updatedAt: new Date() })
    .where(eq(bookingsTable.id, id))
    .returning();

  return res.status(200).json(serializeBooking(updated));
});

router.get("/bookings/:id/can-enter-production", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!(await canAccessBooking(user.id, booking, isAdmin(user)))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const pending = await bookingHasPendingRequiredAgreements(id);
  return res.status(200).json({
    canEnterProduction: !pending && booking.status !== "DISPUTED",
    agreementsComplete: !pending,
    blockedStatuses: PRODUCTION_BLOCKED_STATUSES,
  });
});

export default router;
