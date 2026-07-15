import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable, disputesTable, disputeEvidenceTable } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
  DISPUTE_CATEGORIES,
} from "@/lib/legal-auth";

const createBody = z.object({
  againstUser: z.number().int().positive().optional().nullable(),
  category: z.enum(DISPUTE_CATEGORIES as unknown as [string, ...string[]]),
  reason: z.string().min(2).max(255),
  description: z.string().min(10).max(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const bookingId = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (
      !isAdmin(user) &&
      booking.visionaryUserId !== user.id &&
      booking.manufacturerUserId !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const againstUser =
      parsed.data.againstUser ??
      (booking.visionaryUserId === user.id ? booking.manufacturerUserId : booking.visionaryUserId);

    const [dispute] = await db
      .insert(disputesTable)
      .values({
        bookingId,
        openedBy: user.id,
        againstUser,
        category: parsed.data.category,
        reason: escapeHtml(parsed.data.reason),
        description: escapeHtml(parsed.data.description),
        status: "OPEN",
        priority: parsed.data.priority ?? "NORMAL",
      })
      .returning();

    await db
      .update(bookingsTable)
      .set({ status: "DISPUTED", updatedAt: new Date() })
      .where(eq(bookingsTable.id, bookingId));

    await writeAuditLog({
      actorUserId: user.id,
      action: "DISPUTE_OPENED",
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: { bookingId },
      ipAddress: clientIp(req),
    });

    for (const uid of [booking.visionaryUserId, booking.manufacturerUserId]) {
      if (uid === user.id) continue;
      await createNotification({
        userId: uid,
        eventType: "DISPUTE_OPENED",
        title: "Dispute opened",
        description: `A dispute was opened on booking ${booking.reference}.`,
        relatedType: "Dispute",
        relatedId: dispute.id,
        category: "DISPUTE",
      });
    }

    return NextResponse.json(
      {
        ...dispute,
        createdAt: dispute.createdAt.toISOString(),
        updatedAt: dispute.updatedAt.toISOString(),
        closedAt: dispute.closedAt?.toISOString() ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
