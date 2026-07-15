import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractTemplatesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin, writeAuditLog, clientIp } from "@/lib/legal-auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const [updated] = await db.update(contractTemplatesTable).set({
      status: "ARCHIVED", isActive: false, updatedBy: user.id, updatedAt: new Date(),
    }).where(eq(contractTemplatesTable.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    await writeAuditLog({ actorUserId: user.id, action: "TEMPLATE_ARCHIVED", entityType: "ContractTemplate", entityId: id, ipAddress: clientIp(req) });
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
