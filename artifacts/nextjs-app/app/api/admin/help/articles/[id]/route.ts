import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { escapeHtml } from "@/lib/legal-auth";

const updateBody = z.object({
  title: z.string().min(3).max(255).optional(),
  role: z.string().max(64).optional(),
  category: z.string().max(64).optional(),
  summary: z.string().max(2000).nullable().optional(),
  content: z.string().min(3).max(100000).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
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
    if (parsed.data.title) patch.title = escapeHtml(parsed.data.title);
    if (parsed.data.role) patch.role = parsed.data.role;
    if (parsed.data.category) patch.category = parsed.data.category;
    if (parsed.data.summary !== undefined) {
      patch.summary = parsed.data.summary ? escapeHtml(parsed.data.summary) : null;
    }
    if (parsed.data.content) patch.content = parsed.data.content;
    if (parsed.data.tags) patch.tags = JSON.stringify(parsed.data.tags);
    if (parsed.data.status) {
      patch.status = parsed.data.status;
      if (parsed.data.status === "PUBLISHED") patch.publishedAt = new Date();
    }

    const [row] = await db.update(helpArticlesTable).set(patch).where(eq(helpArticlesTable.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(admin, "HELP_ARTICLE_UPDATED", "HelpArticle", id, {}, req);
    return NextResponse.json(row);
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
      .update(helpArticlesTable)
      .set({ status: "ARCHIVED", updatedBy: admin.id, updatedAt: new Date() })
      .where(eq(helpArticlesTable.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(admin, "HELP_ARTICLE_DELETED", "HelpArticle", id, {}, req);
    return NextResponse.json({ message: "Archived" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
