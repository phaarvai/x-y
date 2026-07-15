import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackTable } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { serializeFeedback } from "@/lib/reviews";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const where = and(
      eq(feedbackTable.reviewedUserId, userId),
      eq(feedbackTable.status, "PUBLISHED"),
    );
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
