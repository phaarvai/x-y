import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await ensureHelpSeed();
    const { slug } = await params;
    const [row] = await db.select().from(helpArticlesTable).where(eq(helpArticlesTable.slug, slug)).limit(1);
    if (!row || row.status !== "PUBLISHED") return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db
      .update(helpArticlesTable)
      .set({ viewCount: (row.viewCount || 0) + 1 })
      .where(eq(helpArticlesTable.id, row.id));

    const related = await db
      .select()
      .from(helpArticlesTable)
      .where(
        and(
          eq(helpArticlesTable.status, "PUBLISHED"),
          eq(helpArticlesTable.category, row.category),
          sql`${helpArticlesTable.id} <> ${row.id}`,
        ),
      )
      .limit(5);

    return NextResponse.json({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      related: related.map((r) => ({ title: r.title, slug: r.slug, summary: r.summary })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
