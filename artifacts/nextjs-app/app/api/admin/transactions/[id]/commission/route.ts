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
import { calculateCommission, serializeTxn } from "@/lib/payments";

const bodySchema = z.object({
  commissionType: z.enum(["FLAT", "PERCENTAGE"]),
  commissionRate: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  commissionAmount: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
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

    const d = parsed.data;
    let commissionAmount = d.commissionAmount != null ? Number(d.commissionAmount) : null;
    if (commissionAmount == null || Number.isNaN(commissionAmount)) {
      const calc = await calculateCommission({
        amount: Number(existing.amount),
        overrideType: d.commissionType,
        overrideValue: d.commissionRate,
      });
      commissionAmount = calc.commissionAmount;
    }

    const [updated] = await db
      .update(transactionsTable)
      .set({
        commissionType: d.commissionType,
        commissionRate: String(d.commissionRate),
        commissionAmount: String(commissionAmount),
        platformFee: String(commissionAmount),
        adminNotes: d.notes != null ? escapeHtml(d.notes) : existing.adminNotes,
        updatedByAdmin: user.id,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "TRANSACTION_COMMISSION_UPDATED",
      entityType: "Transaction",
      entityId: id,
      metadata: {
        commissionType: d.commissionType,
        commissionRate: d.commissionRate,
        commissionAmount,
      },
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeTxn(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
