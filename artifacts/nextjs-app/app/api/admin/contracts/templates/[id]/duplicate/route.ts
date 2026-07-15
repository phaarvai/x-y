import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractTemplatesTable, contractTemplateVersionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin, writeAuditLog, clientIp, escapeHtml } from "@/lib/legal-auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const [cloned] = await db
      .insert(contractTemplatesTable)
      .values({
        title: escapeHtml(`${existing.title} (Copy)`),
        category: existing.category,
        description: existing.description,
        version: 1,
        templateContent: existing.templateContent,
        language: existing.language,
        status: "ACTIVE",
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();

    await db.insert(contractTemplateVersionsTable).values({
      templateId: cloned.id,
      version: 1,
      content: existing.templateContent,
      changeLog: `Duplicated from template #${existing.id}`,
      createdBy: user.id,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "TEMPLATE_DUPLICATED",
      entityType: "ContractTemplate",
      entityId: cloned.id,
      metadata: { duplicatedFrom: existing.id },
      ipAddress: clientIp(req),
    });

    return NextResponse.json(
      { ...cloned, createdAt: cloned.createdAt.toISOString(), updatedAt: cloned.updatedAt.toISOString() },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
