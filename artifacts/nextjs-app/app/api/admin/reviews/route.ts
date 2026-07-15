import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackTable } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireUser, isAuthUser, isAdmin } from "@/lib/legal-auth";
import { serializeFeedback } from "@/lib/reviews";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status") || "PENDING";

    const where = eq(feedbackTable.status, status);
    const rows = await db
      .select()
      .from(feedbackTable)
      .where(where)
      .orderBy(desc(feedbackTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackTable)
      .where(where);

    return NextResponse.json({
      items: rows.map(serializeFeedback),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
