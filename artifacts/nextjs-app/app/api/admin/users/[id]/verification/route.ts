import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { createNotification } from "@/lib/legal-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "users", "write");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = z
      .object({
        identityVerificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
        reset: z.boolean().optional(),
      })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const nextStatus = parsed.data.reset
      ? "UNVERIFIED"
      : parsed.data.identityVerificationStatus || "UNVERIFIED";

    const [updated] = await db
      .update(usersTable)
      .set({ identityVerificationStatus: nextStatus, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await logAdminAction(admin, "VERIFICATION_RESET", "User", id, { status: nextStatus }, req);
    await createNotification({
      userId: id,
      eventType: "VERIFICATION_RESET",
      title: "Verification reset",
      description: `Your identity verification status is now ${nextStatus}.`,
      relatedType: "User",
      relatedId: id,
      category: "ADMIN",
    });

    return NextResponse.json({
      id: updated.id,
      identityVerificationStatus: updated.identityVerificationStatus,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
