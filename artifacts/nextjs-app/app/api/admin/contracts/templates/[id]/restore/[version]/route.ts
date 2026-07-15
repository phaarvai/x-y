import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractTemplatesTable, contractTemplateVersionsTable } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin, writeAuditLog, clientIp } from "@/lib/legal-auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; version: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id: idStr, version: verStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    const version = parseInt(verStr, 10);
    if (Number.isNaN(id) || Number.isNaN(version)) {
      return NextResponse.json({ error: "Invalid id or version" }, { status: 400 });
    }

    const [existing] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const [historical] = await db
      .select()
      .from(contractTemplateVersionsTable)
      .where(
        and(
          eq(contractTemplateVersionsTable.templateId, id),
          eq(contractTemplateVersionsTable.version, version),
        ),
      )
      .limit(1);
    if (!historical) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const nextVersion = existing.version + 1;
    const [updated] = await db
      .update(contractTemplatesTable)
      .set({
        templateContent: historical.content,
        version: nextVersion,
        status: "ACTIVE",
        isActive: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(contractTemplatesTable.id, id))
      .returning();

    await db.insert(contractTemplateVersionsTable).values({
      templateId: id,
      version: nextVersion,
      content: historical.content,
      changeLog: `Restored from version ${version}`,
      createdBy: user.id,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "TEMPLATE_RESTORED",
      entityType: "ContractTemplate",
      entityId: id,
      metadata: { restoredFrom: version, version: nextVersion },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
