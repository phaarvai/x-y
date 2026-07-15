import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listingTemplatesTable } from "@/lib/schema";
import { ensureHelpSeed } from "@/lib/help-seed";
import { serializeTemplate } from "@/lib/help-api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureHelpSeed();
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const [row] = await db.select().from(listingTemplatesTable).where(eq(listingTemplatesTable.id, id)).limit(1);
    if (!row || row.status !== "ACTIVE") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serializeTemplate(row));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
