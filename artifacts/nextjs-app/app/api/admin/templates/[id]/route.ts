import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listingTemplatesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { escapeHtml, createNotification } from "@/lib/legal-auth";

const updateBody = z.object({
  name: z.string().min(2).max(255).optional(),
  industry: z.string().max(128).nullable().optional(),
  category: z.string().min(2).max(128).optional(),
  description: z.string().max(5000).nullable().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req, "content", "write");
    if (!isAdminContext(admin)) return admin;

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = updateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const patch: Record<string, unknown> = { updatedBy: admin.id, updatedAt: new Date() };
    if (parsed.data.name) patch.name = escapeHtml(parsed.data.name);
    if (parsed.data.industry !== undefined) patch.industry = parsed.data.industry;
    if (parsed.data.category) patch.category = parsed.data.category;
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description ? escapeHtml(parsed.data.description) : null;
    }
    if (parsed.data.templateData) patch.templateData = JSON.stringify(parsed.data.templateData);
    if (parsed.data.status) patch.status = parsed.data.status;

    const [row] = await db.update(listingTemplatesTable).set(patch).where(eq(listingTemplatesTable.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(admin, "TEMPLATE_UPDATED", "ListingTemplate", id, {}, req);
    await createNotification({
      userId: admin.id,
      eventType: "TEMPLATE_UPDATED",
      title: "Template updated",
      description: `Template "${row.name}" was updated.`,
      relatedType: "ListingTemplate",
      relatedId: id,
      category: "ADMIN",
    }).catch(() => undefined);
    return NextResponse.json({ ...row, templateData: JSON.parse(row.templateData) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req, "content", "manage");
    if (!isAdminContext(admin)) return admin;

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db
      .update(listingTemplatesTable)
      .set({ status: "ARCHIVED", updatedBy: admin.id, updatedAt: new Date() })
      .where(eq(listingTemplatesTable.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(admin, "TEMPLATE_DELETED", "ListingTemplate", id, { soft: true }, req);
    return NextResponse.json({ message: "Archived", id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
