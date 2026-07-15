import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputesTable, disputeEvidenceTable, bookingsTable } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
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

const statusBody = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "CLOSED"]),
  resolutionNotes: z.string().max(5000).optional().nullable(),
});

const closeBody = z.object({
  resolutionNotes: z.string().min(2).max(5000),
});

const evidenceBody = z.object({
  fileUrl: z.string().min(1).max(2000),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(128),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
    if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    if (!isAdmin(user) && dispute.openedBy !== user.id && dispute.againstUser !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const evidence = await db
      .select()
      .from(disputeEvidenceTable)
      .where(eq(disputeEvidenceTable.disputeId, id))
      .orderBy(desc(disputeEvidenceTable.createdAt));
    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, dispute.bookingId))
      .limit(1);

    return NextResponse.json({
      ...dispute,
      createdAt: dispute.createdAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
      closedAt: dispute.closedAt?.toISOString() ?? null,
      booking: booking
        ? {
            id: booking.id,
            reference: booking.reference,
            status: booking.status,
            visionaryUserId: booking.visionaryUserId,
            manufacturerUserId: booking.manufacturerUserId,
          }
        : null,
      evidence: evidence.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
