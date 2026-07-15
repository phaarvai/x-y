import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { disputesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "disputes", "write");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = z
      .object({ status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"]) })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const patch: Partial<typeof disputesTable.$inferInsert> = {
      status: parsed.data.status,
      updatedAt: new Date(),
    };
    if (parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED") {
      patch.closedBy = admin.id;
      patch.closedAt = new Date();
    }

    const [updated] = await db.update(disputesTable).set(patch).where(eq(disputesTable.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAdminAction(admin, "DISPUTE_STATUS_UPDATED", "Dispute", id, { status: parsed.data.status }, req);

    return NextResponse.json({
      ...updated,
      closedAt: updated.closedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
