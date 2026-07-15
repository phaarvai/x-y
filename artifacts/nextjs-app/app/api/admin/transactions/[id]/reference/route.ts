import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { serializeTxn } from "@/lib/payments";

const bodySchema = z.object({
  referenceNumber: z.string().min(1).max(128),
  adminNotes: z.string().max(5000).optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    const [updated] = await db
      .update(transactionsTable)
      .set({
        referenceNumber: escapeHtml(parsed.data.referenceNumber),
        adminNotes:
          parsed.data.adminNotes != null
            ? escapeHtml(parsed.data.adminNotes)
            : existing.adminNotes,
        updatedByAdmin: user.id,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "TRANSACTION_REFERENCE_UPDATED",
      entityType: "Transaction",
      entityId: id,
      metadata: { referenceNumber: parsed.data.referenceNumber },
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeTxn(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
