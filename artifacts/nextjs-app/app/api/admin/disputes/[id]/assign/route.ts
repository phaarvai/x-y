import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { disputesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "disputes", "assign");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = z
      .object({ assignedAdminId: z.number().int() })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [existing] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await db
      .update(disputesTable)
      .set({ status: "UNDER_REVIEW", updatedAt: new Date() })
      .where(eq(disputesTable.id, id))
      .returning();

    await logAdminAction(
      admin,
      "DISPUTE_ASSIGNED",
      "Dispute",
      id,
      { assignedAdminId: parsed.data.assignedAdminId },
      req,
    );

    return NextResponse.json({
      ...updated,
      assignedAdminId: parsed.data.assignedAdminId,
      closedAt: updated.closedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
