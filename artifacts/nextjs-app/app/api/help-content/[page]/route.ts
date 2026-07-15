import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpContentTable } from "@/lib/schema";
import { getHelpForPage } from "@/lib/help-seed";
import { serializeHelp } from "@/lib/help-api-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ page: string }> }) {
  try {
    const { page } = await params;
    const lang = new URL(req.url).searchParams.get("language") || "en";
    const rows = await getHelpForPage(page, lang);
    const byField: Record<string, ReturnType<typeof serializeHelp>> = {};
    for (const r of rows) byField[r.fieldKey] = serializeHelp(r);
    return NextResponse.json({ page, fields: byField, items: rows.map(serializeHelp) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
