import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractTemplatesTable, contractTemplateVersionsTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, isAuthUser, isAdmin, writeAuditLog, clientIp, escapeHtml, CONTRACT_CATEGORIES } from "@/lib/legal-auth";

const updateBody = z.object({
  title: z.string().min(2).max(255).optional(),
  category: z.enum(CONTRACT_CATEGORIES as unknown as [string, ...string[]]).optional(),
  description: z.string().max(2000).optional().nullable(),
  templateContent: z.string().min(10).optional(),
  language: z.string().max(10).optional(),
  changeLog: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

function serialize(t: typeof contractTemplatesTable.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const [template] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, id)).limit(1);
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const versions = await db.select().from(contractTemplateVersionsTable).where(eq(contractTemplateVersionsTable.templateId, id)).orderBy(desc(contractTemplateVersionsTable.version));
    return NextResponse.json({
      ...serialize(template),
      versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const [existing] = await db.select().from(contractTemplatesTable).where(eq(contractTemplatesTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    if (existing.status === "ARCHIVED") return NextResponse.json({ error: "Archived templates cannot be edited" }, { status: 409 });

    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const contentChanged = d.templateContent != null && d.templateContent !== existing.templateContent;
    const nextVersion = contentChanged ? existing.version + 1 : existing.version;

    const [updated] = await db.update(contractTemplatesTable).set({
      ...(d.title != null ? { title: escapeHtml(d.title) } : {}),
      ...(d.category != null ? { category: d.category } : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
      ...(d.templateContent != null ? { templateContent: d.templateContent } : {}),
      ...(d.language != null ? { language: d.language } : {}),
      ...(d.isActive != null ? { isActive: d.isActive } : {}),
      version: nextVersion,
      updatedBy: user.id,
      updatedAt: new Date(),
    }).where(eq(contractTemplatesTable.id, id)).returning();

    if (contentChanged) {
      await db.insert(contractTemplateVersionsTable).values({
        templateId: id,
        version: nextVersion,
        content: d.templateContent!,
        changeLog: d.changeLog ? escapeHtml(d.changeLog) : `Version ${nextVersion}`,
        createdBy: user.id,
      });
      await writeAuditLog({ actorUserId: user.id, action: "TEMPLATE_VERSION_CREATED", entityType: "ContractTemplate", entityId: id, metadata: { version: nextVersion }, ipAddress: clientIp(req) });
    }
    await writeAuditLog({ actorUserId: user.id, action: "TEMPLATE_UPDATED", entityType: "ContractTemplate", entityId: id, ipAddress: clientIp(req) });
    return NextResponse.json(serialize(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const [updated] = await db.update(contractTemplatesTable).set({ status: "DELETED", isActive: false, updatedBy: user.id, updatedAt: new Date() }).where(eq(contractTemplatesTable.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    await writeAuditLog({ actorUserId: user.id, action: "TEMPLATE_DELETED", entityType: "ContractTemplate", entityId: id, ipAddress: clientIp(req) });
    return NextResponse.json({ message: "Template deleted (soft)", template: serialize(updated) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
