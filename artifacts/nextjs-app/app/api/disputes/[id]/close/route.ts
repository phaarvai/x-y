import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputesTable, bookingsTable } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";
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

const closeBody = z.object({
  resolutionNotes: z.string().min(2).max(5000),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Only admins may close disputes" }, { status: 403 });
    }
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = closeBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

    const [updated] = await db
      .update(disputesTable)
      .set({
        status: "CLOSED",
        resolutionNotes: escapeHtml(parsed.data.resolutionNotes),
        closedBy: user.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disputesTable.id, id))
      .returning();

    const openOthers = await db
      .select()
      .from(disputesTable)
      .where(
        and(
          eq(disputesTable.bookingId, existing.bookingId),
          sql`${disputesTable.status} NOT IN ('CLOSED','RESOLVED','REJECTED')`,
          sql`${disputesTable.id} <> ${id}`,
        ),
      )
      .limit(1);

    if (openOthers.length === 0) {
      await db
        .update(bookingsTable)
        .set({ status: "CONFIRMED", updatedAt: new Date() })
        .where(eq(bookingsTable.id, existing.bookingId));
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "DISPUTE_CLOSED",
      entityType: "Dispute",
      entityId: id,
      ipAddress: clientIp(req),
    });

    for (const uid of [existing.openedBy, existing.againstUser]) {
      if (!uid) continue;
      await createNotification({
        userId: uid,
        eventType: "DISPUTE_CLOSED",
        title: "Dispute closed",
        description: `Dispute #${id} was closed by an administrator.`,
        relatedType: "Dispute",
        relatedId: id,
        category: "DISPUTE",
      });
    }

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      closedAt: updated.closedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
