import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { helpContentTable } from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";
import { ensureHelpSeed } from "@/lib/help-seed";
import { serializeHelp } from "@/lib/help-api-utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "content", "read");
    if (!isAdminContext(admin)) return admin;
    await ensureHelpSeed();
    const rows = await db
      .select()
      .from(helpContentTable)
      .orderBy(helpContentTable.page, helpContentTable.fieldKey);
    return NextResponse.json({ items: rows.map(serializeHelp) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
