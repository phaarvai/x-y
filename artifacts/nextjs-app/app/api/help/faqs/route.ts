import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpFaqsTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";

export async function GET() {
  try {
    await ensureHelpSeed();
    const rows = await db
      .select()
      .from(helpFaqsTable)
      .where(eq(helpFaqsTable.status, "ACTIVE"))
      .orderBy(helpFaqsTable.sortOrder);
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
