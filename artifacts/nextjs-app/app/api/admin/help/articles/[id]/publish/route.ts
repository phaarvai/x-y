import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req, "content", "write");
    if (!isAdminContext(admin)) return admin;

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db
      .update(helpArticlesTable)
      .set({ status: "PUBLISHED", publishedAt: new Date(), updatedBy: admin.id, updatedAt: new Date() })
      .where(eq(helpArticlesTable.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(admin, "HELP_ARTICLE_PUBLISHED", "HelpArticle", id, {}, req);
    return NextResponse.json(row);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
