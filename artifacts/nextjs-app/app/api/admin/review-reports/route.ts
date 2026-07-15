import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportedReviewsTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status") || undefined;

    const conditions = [];
    if (status) conditions.push(eq(reportedReviewsTable.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(reportedReviewsTable)
      .where(where)
      .orderBy(desc(reportedReviewsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      items: rows.map((r) => ({
        ...r,
        handledAt: r.handledAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
