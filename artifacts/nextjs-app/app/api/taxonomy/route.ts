import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoriesTable } from "@/lib/schema";
import { and, asc, eq } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";

/**
 * Public taxonomy endpoint — industries, machinery types, currencies, certifications, etc.
 * Replaces hard-coded frontend lists for scalable multi-region catalogs.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("search", `${ip}:taxonomy`, RATE_LIMITS.search.limit, RATE_LIMITS.search.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const type = req.nextUrl.searchParams.get("type");
    const conditions = [eq(categoriesTable.status, "ACTIVE")];
    if (type) conditions.push(eq(categoriesTable.categoryType, type.toUpperCase()));

    const rows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        categoryType: categoriesTable.categoryType,
        description: categoriesTable.description,
        icon: categoriesTable.icon,
        parentId: categoriesTable.parentId,
        sortOrder: categoriesTable.sortOrder,
      })
      .from(categoriesTable)
      .where(and(...conditions))
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));

    return NextResponse.json({
      items: rows,
      types: ["INDUSTRY", "MACHINERY", "RAW_MATERIAL", "SERVICE", "CERTIFICATION", "LOCATION", "CURRENCY"],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
