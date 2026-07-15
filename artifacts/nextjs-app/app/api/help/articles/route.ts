import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";

export async function GET(req: NextRequest) {
  try {
    await ensureHelpSeed();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") ? String(searchParams.get("role")) : undefined;
    const category = searchParams.get("category") ? String(searchParams.get("category")) : undefined;
    const page = Math.max(1, parseInt(String(searchParams.get("page") || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(searchParams.get("limit") || "20"), 10) || 20));
    const conditions = [eq(helpArticlesTable.status, "PUBLISHED")];
    if (role) conditions.push(or(eq(helpArticlesTable.role, role), eq(helpArticlesTable.role, "GENERAL"))!);
    if (category) conditions.push(eq(helpArticlesTable.category, category));
    const where = and(...conditions);
    const rows = await db
      .select()
      .from(helpArticlesTable)
      .where(where)
      .orderBy(desc(helpArticlesTable.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(helpArticlesTable).where(where);
    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        role: r.role,
        category: r.category,
        summary: r.summary,
        tags: r.tags ? JSON.parse(r.tags) : [],
        publishedAt: r.publishedAt?.toISOString() ?? null,
        viewCount: r.viewCount,
      })),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
