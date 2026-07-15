import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction, slugify } from "@/lib/admin-rbac";
import { escapeHtml } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "content", "read");
    if (!isAdminContext(admin)) return admin;
    const rows = await db.select().from(helpArticlesTable).orderBy(desc(helpArticlesTable.updatedAt));
    return NextResponse.json({
      items: rows.map((r) => ({
        ...r,
        tags: r.tags ? JSON.parse(r.tags) : [],
        publishedAt: r.publishedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createBody = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().max(255).optional(),
  role: z.string().max(64).default("GENERAL"),
  category: z.string().min(2).max(64),
  summary: z.string().max(2000).optional(),
  content: z.string().min(3).max(100000),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "content", "write");
    if (!isAdminContext(admin)) return admin;

    const parsed = createBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const s = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.title);
    try {
      const [row] = await db
        .insert(helpArticlesTable)
        .values({
          title: escapeHtml(parsed.data.title),
          slug: s,
          role: parsed.data.role,
          category: parsed.data.category,
          summary: parsed.data.summary ? escapeHtml(parsed.data.summary) : null,
          content: parsed.data.content,
          tags: JSON.stringify(parsed.data.tags || []),
          status: parsed.data.status || "DRAFT",
          publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
          createdBy: admin.id,
          updatedBy: admin.id,
        })
        .returning();
      await logAdminAction(admin, "HELP_ARTICLE_CREATED", "HelpArticle", row.id, {}, req);
      return NextResponse.json(row, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
