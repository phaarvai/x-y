import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpArticlesTable, listingTemplatesTable, helpFaqsTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";
import { ChatbotService } from "@/lib/chatbot-service";

export async function GET(req: NextRequest) {
  try {
    await ensureHelpSeed();
    const q = new URL(req.url).searchParams.get("q")?.trim() || "";
    if (q.length < 2) return NextResponse.json({ error: "Query too short" }, { status: 400 });
    const like = `%${q}%`;
    const [articles, templates, faqs] = await Promise.all([
      db
        .select()
        .from(helpArticlesTable)
        .where(
          and(
            eq(helpArticlesTable.status, "PUBLISHED"),
            or(
              ilike(helpArticlesTable.title, like),
              ilike(helpArticlesTable.summary, like),
              ilike(helpArticlesTable.content, like),
            )!,
          ),
        )
        .limit(15),
      db
        .select()
        .from(listingTemplatesTable)
        .where(
          and(
            eq(listingTemplatesTable.status, "ACTIVE"),
            or(ilike(listingTemplatesTable.name, like), ilike(listingTemplatesTable.description, like))!,
          ),
        )
        .limit(10),
      db
        .select()
        .from(helpFaqsTable)
        .where(
          and(
            eq(helpFaqsTable.status, "ACTIVE"),
            or(ilike(helpFaqsTable.question, like), ilike(helpFaqsTable.answer, like))!,
          ),
        )
        .limit(10),
    ]);
    return NextResponse.json({
      q,
      articles: articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        category: a.category,
      })),
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
      })),
      faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
      chatbotSuggestions: ChatbotService.getSuggestions(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
