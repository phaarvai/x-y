import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpContentTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";

export async function GET(req: NextRequest) {
  try {
    await ensureHelpSeed();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const lang = searchParams.get("language") || "en";
    const conditions = [eq(helpContentTable.status, "ACTIVE"), eq(helpContentTable.language, lang)];
    if (page) conditions.push(eq(helpContentTable.page, page));
    const rows = await db.select().from(helpContentTable).where(and(...conditions));
    return NextResponse.json({
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
