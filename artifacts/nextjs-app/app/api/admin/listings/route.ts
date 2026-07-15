import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { listingModerationsTable } from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

function serialize(m: typeof listingModerationsTable.$inferSelect) {
  return {
    ...m,
    reviewedAt: m.reviewedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "listings", "read");
    if (!isAdminContext(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");
    const listingType = searchParams.get("listingType");
    const q = searchParams.get("q");

    const conditions = [];
    if (status) conditions.push(eq(listingModerationsTable.status, status));
    if (listingType) conditions.push(eq(listingModerationsTable.listingType, listingType));
    if (q) {
      conditions.push(
        or(
          ilike(listingModerationsTable.title, `%${q}%`),
          sql`${listingModerationsTable.listingId}::text = ${q}`,
        )!,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(listingModerationsTable)
      .where(where)
      .orderBy(desc(listingModerationsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listingModerationsTable)
      .where(where);

    return NextResponse.json({ items: rows.map(serialize), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
