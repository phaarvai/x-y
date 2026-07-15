import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listingTemplatesTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";
import { serializeTemplate } from "@/lib/help-api-utils";

export async function GET(req: NextRequest) {
  try {
    await ensureHelpSeed();
    const { searchParams } = new URL(req.url);
    const industry = searchParams.get("industry") ? String(searchParams.get("industry")) : undefined;
    const category = searchParams.get("category") ? String(searchParams.get("category")) : undefined;
    const conditions = [eq(listingTemplatesTable.status, "ACTIVE")];
    if (industry) conditions.push(eq(listingTemplatesTable.industry, industry));
    if (category) conditions.push(eq(listingTemplatesTable.category, category));
    const rows = await db
      .select()
      .from(listingTemplatesTable)
      .where(and(...conditions))
      .orderBy(desc(listingTemplatesTable.updatedAt));
    return NextResponse.json({ items: rows.map(serializeTemplate) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
