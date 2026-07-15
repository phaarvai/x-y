import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { legalServiceProvidersTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin, writeAuditLog, clientIp } from "@/lib/legal-auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (existing.userId !== user.id && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [updated] = await db.update(legalServiceProvidersTable).set({ isPublished: false, updatedAt: new Date() }).where(eq(legalServiceProvidersTable.id, id)).returning();
    await writeAuditLog({ actorUserId: user.id, action: "LEGAL_PROFILE_UNPUBLISHED", entityType: "LegalServiceProvider", entityId: id, ipAddress: clientIp(req) });
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
