import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin } from "@/lib/legal-auth";
import { bookingHasPendingRequiredAgreements } from "@/lib/booking-legal";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (
      !isAdmin(user) &&
      booking.visionaryUserId !== user.id &&
      booking.manufacturerUserId !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = await bookingHasPendingRequiredAgreements(id);
    if (pending) {
      return NextResponse.json(
        {
          error: "AGREEMENTS_PENDING",
          message: "Required legal agreements must be accepted before production can start.",
        },
        { status: 403 },
      );
    }
    if (booking.status === "DISPUTED") {
      return NextResponse.json({ error: "Booking is disputed" }, { status: 409 });
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "IN_PRODUCTION", updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
