import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
} from "@/lib/legal-auth";

/** Mark booking COMPLETED so reviews can be submitted (participant or admin). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const allowed =
      isAdmin(user) ||
      booking.visionaryUserId === user.id ||
      booking.manufacturerUserId === user.id;
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status === "DISPUTED") {
      return NextResponse.json({ error: "Resolve dispute before completing" }, { status: 409 });
    }
    if (booking.status === "COMPLETED") {
      return NextResponse.json({
        ...booking,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      });
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "BOOKING_COMPLETED",
      entityType: "Booking",
      entityId: id,
      ipAddress: clientIp(req),
    });

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
