import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceProviderProfilesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
} from "@/lib/legal-auth";
import { serProvider } from "@/lib/marketplace-owned";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updated] = await db
      .update(serviceProviderProfilesTable)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(serviceProviderProfilesTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "SERVICE_PROVIDER_UNPUBLISHED",
      entityType: "ServiceProviderProfile",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serProvider(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
