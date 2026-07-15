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

const statusBody = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "CLOSED"]),
  resolutionNotes: z.string().max(5000).optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = statusBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

    const [updated] = await db
      .update(disputesTable)
      .set({
        status: parsed.data.status,
        resolutionNotes:
          parsed.data.resolutionNotes != null
            ? escapeHtml(parsed.data.resolutionNotes)
            : existing.resolutionNotes,
        updatedAt: new Date(),
        ...(parsed.data.status === "CLOSED" || parsed.data.status === "RESOLVED"
          ? { closedBy: user.id, closedAt: new Date() }
          : {}),
      })
      .where(eq(disputesTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "DISPUTE_STATUS_UPDATED",
      entityType: "Dispute",
      entityId: id,
      metadata: { status: parsed.data.status },
      ipAddress: clientIp(req),
    });

    for (const uid of [existing.openedBy, existing.againstUser]) {
      if (!uid) continue;
      await createNotification({
        userId: uid,
        eventType: "DISPUTE_UPDATED",
        title: "Dispute status updated",
        description: `Dispute #${id} is now ${parsed.data.status}.`,
        relatedType: "Dispute",
        relatedId: id,
        category: "DISPUTE",
      });
      if (parsed.data.status === "RESOLVED") {
        await createNotification({
          userId: uid,
          eventType: "DISPUTE_RESOLVED",
          title: "Dispute resolved",
          description: `Dispute #${id} has been resolved.`,
          relatedType: "Dispute",
          relatedId: id,
          category: "DISPUTE",
        });
      }
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
