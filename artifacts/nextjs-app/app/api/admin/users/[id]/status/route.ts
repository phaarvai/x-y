import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { createNotification, escapeHtml } from "@/lib/legal-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "users", "suspend");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    if (id === admin.id) return NextResponse.json({ error: "Cannot change your own status" }, { status: 400 });

    const parsed = z
      .object({
        status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
        reason: z.string().max(2000).optional(),
      })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const reason = parsed.data.reason ? escapeHtml(parsed.data.reason) : null;
    const [updated] = await db
      .update(usersTable)
      .set({
        status: parsed.data.status,
        suspendedAt: parsed.data.status === "SUSPENDED" ? new Date() : null,
        suspendedReason: parsed.data.status === "SUSPENDED" ? reason : null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const action =
      parsed.data.status === "SUSPENDED"
        ? "USER_SUSPENDED"
        : parsed.data.status === "ACTIVE"
          ? "USER_ACTIVATED"
          : "USER_DEACTIVATED";

    await logAdminAction(admin, action, "User", id, { status: parsed.data.status, reason }, req);
    await createNotification({
      userId: id,
      eventType: action,
      title: parsed.data.status === "SUSPENDED" ? "Account suspended" : "Account activated",
      description:
        parsed.data.status === "SUSPENDED"
          ? reason || "Your account has been suspended by an administrator."
          : "Your account has been reactivated.",
      relatedType: "User",
      relatedId: id,
      category: "ADMIN",
    });

    return NextResponse.json({
      ...updated,
      suspendedAt: updated.suspendedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
