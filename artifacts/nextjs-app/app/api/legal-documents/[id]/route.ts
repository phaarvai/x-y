import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  bookingLegalDocumentsTable,
  agreementAcceptancesTable,
  bookingsTable,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin } from "@/lib/legal-auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [doc] = await db
      .select()
      .from(bookingLegalDocumentsTable)
      .where(eq(bookingLegalDocumentsTable.id, id))
      .limit(1);
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, doc.bookingId)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const allowed =
      isAdmin(user) ||
      booking.visionaryUserId === user.id ||
      booking.manufacturerUserId === user.id;
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const acceptances = await db
      .select()
      .from(agreementAcceptancesTable)
      .where(eq(agreementAcceptancesTable.bookingLegalDocumentId, id));

    return NextResponse.json({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      acceptances: acceptances.map((a) => ({
        ...a,
        acceptedAt: a.acceptedAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
