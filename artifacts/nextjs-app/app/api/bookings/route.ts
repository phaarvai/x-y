import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

const bookingBody = z.object({
  manufacturerUserId: z.number().int().positive(),
  facilityId: z.number().int().positive().optional().nullable(),
  inventoryId: z.number().int().positive().optional().nullable(),
  agreedPrice: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const parsed = bookingBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const reference = `XY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [booking] = await db
      .insert(bookingsTable)
      .values({
        reference,
        visionaryUserId: user.id,
        manufacturerUserId: parsed.data.manufacturerUserId,
        facilityId: parsed.data.facilityId ?? null,
        inventoryId: parsed.data.inventoryId ?? null,
        status: "CONFIRMED",
        agreedPrice: parsed.data.agreedPrice != null ? String(parsed.data.agreedPrice) : null,
        currency: parsed.data.currency ?? "INR",
        notes: parsed.data.notes ? escapeHtml(parsed.data.notes) : null,
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
      userId: parsed.data.manufacturerUserId,
      eventType: "BOOKING_CONFIRMED",
      title: "New booking confirmed",
      description: `Booking ${reference} was created.`,
      relatedType: "Booking",
      relatedId: booking.id,
      category: "BOOKING",
    });
    return NextResponse.json(
      {
        ...booking,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const asV = await db.select().from(bookingsTable).where(eq(bookingsTable.visionaryUserId, user.id));
    const asM = await db.select().from(bookingsTable).where(eq(bookingsTable.manufacturerUserId, user.id));
    const map = new Map<number, typeof bookingsTable.$inferSelect>();
    for (const b of [...asV, ...asM]) map.set(b.id, b);
    return NextResponse.json({
      items: [...map.values()].map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        startDate: b.startDate?.toISOString() ?? null,
        endDate: b.endDate?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
