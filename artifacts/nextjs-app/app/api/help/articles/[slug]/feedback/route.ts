import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable, helpArticleFeedbackTable } from "@/lib/schema";
import { requireUser, isAuthUser } from "@/lib/legal-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const parsed = z.object({ helpful: z.boolean() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [article] = await db.select().from(helpArticlesTable).where(eq(helpArticlesTable.slug, slug)).limit(1);
    if (!article || article.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let userId: number | null = null;
    const auth = await requireUser(req);
    if (isAuthUser(auth)) userId = auth.id;

    await db.insert(helpArticleFeedbackTable).values({
      articleId: article.id,
      userId,
      helpful: parsed.data.helpful,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
