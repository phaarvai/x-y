import { db } from "@/lib/db";
import {
  bookingsTable,
  bookingLegalDocumentsTable,
  agreementAcceptancesTable,
} from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function bookingHasPendingRequiredAgreements(bookingId: number) {
  const docs = await db
    .select()
    .from(bookingLegalDocumentsTable)
    .where(
      and(
        eq(bookingLegalDocumentsTable.bookingId, bookingId),
        eq(bookingLegalDocumentsTable.requiresAcceptance, true),
      ),
    );
  if (!docs.length) return false;
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) return true;
  const required = [booking.visionaryUserId, booking.manufacturerUserId];
  for (const doc of docs) {
    const acceptances = await db
      .select()
      .from(agreementAcceptancesTable)
      .where(eq(agreementAcceptancesTable.bookingLegalDocumentId, doc.id));
    const accepted = new Set(acceptances.filter((a) => a.accepted).map((a) => a.userId));
    for (const uid of required) if (!accepted.has(uid)) return true;
  }
  return false;
}
