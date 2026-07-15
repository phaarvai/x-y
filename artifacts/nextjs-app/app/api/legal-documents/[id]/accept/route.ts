import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  bookingsTable,
  bookingLegalDocumentsTable,
  agreementAcceptancesTable,
} from "@/lib/schema";
import { and, eq } from "drizzle-orm";
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

const acceptBody = z.object({
  digitalSignature: z.string().min(2).max(255),
  accepted: z.literal(true),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = acceptBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(bookingLegalDocumentsTable)
      .where(eq(bookingLegalDocumentsTable.id, id))
      .limit(1);
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, doc.bookingId))
      .limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (
      !isAdmin(user) &&
      booking.visionaryUserId !== user.id &&
      booking.manufacturerUserId !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (existing.length) {
      return NextResponse.json({ error: "Agreement already accepted by this user" }, { status: 409 });
    }

    const [acceptance] = await db
      .insert(agreementAcceptancesTable)
      .values({
        bookingLegalDocumentId: id,
        userId: user.id,
        accepted: true,
        acceptedAt: new Date(),
        acceptedIp: clientIp(req),
        acceptedUserAgent: req.headers.get("user-agent")?.slice(0, 1000) ?? null,
        digitalSignature: escapeHtml(parsed.data.digitalSignature),
      })
      .returning();

    const pending = await bookingHasPendingRequiredAgreements(booking.id);
    await db
      .update(bookingLegalDocumentsTable)
      .set({ status: pending ? "PARTIALLY_ACCEPTED" : "ACCEPTED", updatedAt: new Date() })
      .where(eq(bookingLegalDocumentsTable.id, id));

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

    return NextResponse.json(
      {
        acceptance: {
          ...acceptance,
          acceptedAt: acceptance.acceptedAt.toISOString(),
          createdAt: acceptance.createdAt.toISOString(),
        },
        agreementsComplete: !pending,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
