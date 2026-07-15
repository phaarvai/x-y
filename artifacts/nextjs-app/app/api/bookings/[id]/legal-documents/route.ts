import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  bookingsTable,
  bookingLegalDocumentsTable,
  agreementAcceptancesTable,
  contractTemplatesTable,
} from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { bookingHasPendingRequiredAgreements } from "@/lib/booking-legal";

const attachBody = z.object({
  templateId: z.number().int().positive().optional().nullable(),
  documentTitle: z.string().min(2).max(255),
  documentUrl: z.string().max(2000).optional().nullable(),
  documentContent: z.string().optional().nullable(),
  requiresAcceptance: z.boolean().optional(),
});

async function loadBooking(id: number) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  return booking;
}

function canAccess(userId: number, booking: typeof bookingsTable.$inferSelect, admin: boolean) {
  return admin || booking.visionaryUserId === userId || booking.manufacturerUserId === userId;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const booking = await loadBooking(id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!canAccess(user.id, booking, isAdmin(user))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const pending = await bookingHasPendingRequiredAgreements(id);

    return NextResponse.json({
      booking: {
        ...booking,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        startDate: booking.startDate?.toISOString() ?? null,
        endDate: booking.endDate?.toISOString() ?? null,
      },
      items: docs.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        acceptances: acceptances
          .filter((a) => a.bookingLegalDocumentId === d.id)
          .map((a) => ({
            ...a,
            acceptedAt: a.acceptedAt.toISOString(),
            createdAt: a.createdAt.toISOString(),
          })),
      })),
      agreementsComplete: !pending,
      canEnterProduction: !pending && booking.status !== "DISPUTED",
      blockingMessage: pending
        ? "All required parties must accept legal agreements before production can begin."
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const booking = await loadBooking(id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!canAccess(user.id, booking, isAdmin(user))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = attachBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    let content = parsed.data.documentContent ?? null;
    let version = 1;
    let title = escapeHtml(parsed.data.documentTitle);
    if (parsed.data.templateId) {
      const [template] = await db
        .select()
        .from(contractTemplatesTable)
        .where(eq(contractTemplatesTable.id, parsed.data.templateId))
        .limit(1);
      if (!template?.isActive) {
        return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 });
      }
      content = content ?? template.templateContent;
      version = template.version;
    }

    const [doc] = await db
      .insert(bookingLegalDocumentsTable)
      .values({
        bookingId: id,
        templateId: parsed.data.templateId ?? null,
        documentTitle: title,
        documentUrl: parsed.data.documentUrl ?? null,
        documentContent: content,
        version,
        status: "PENDING",
        requiresAcceptance: parsed.data.requiresAcceptance ?? true,
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

    for (const uid of [booking.visionaryUserId, booking.manufacturerUserId]) {
      if (uid === user.id) continue;
      await createNotification({
        userId: uid,
        eventType: "CONTRACT_ATTACHED",
        title: "Legal agreement attached",
        description: `"${doc.documentTitle}" was added to booking ${booking.reference}.`,
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

    return NextResponse.json(
      { ...doc, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString(), acceptances: [] },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
