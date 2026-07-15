import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractTemplatesTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireUser, isAuthUser } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const rows = await db
      .select()
      .from(contractTemplatesTable)
      .where(and(eq(contractTemplatesTable.isActive, true), eq(contractTemplatesTable.status, "ACTIVE")))
      .orderBy(desc(contractTemplatesTable.updatedAt));
    return NextResponse.json({
      items: rows.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        description: t.description,
        version: t.version,
        language: t.language,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
