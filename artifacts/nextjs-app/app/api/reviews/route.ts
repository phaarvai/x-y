import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackTable, usersTable } from "@/lib/schema";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { serializeFeedback } from "@/lib/reviews";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const sort = searchParams.get("sort") || "newest";
    const rating = searchParams.get("rating")
      ? parseInt(searchParams.get("rating")!, 10)
      : undefined;
    const verifiedOnly = searchParams.get("verified") === "true";
    const q = searchParams.get("q") || undefined;
    const facilityId = searchParams.get("facilityId")
      ? parseInt(searchParams.get("facilityId")!, 10)
      : undefined;
    const reviewedUserId = searchParams.get("reviewedUserId")
      ? parseInt(searchParams.get("reviewedUserId")!, 10)
      : undefined;

    const conditions = [eq(feedbackTable.status, "PUBLISHED")];
    if (rating && rating >= 1 && rating <= 5) {
      conditions.push(eq(feedbackTable.overallRating, rating));
    }
    if (verifiedOnly) conditions.push(eq(feedbackTable.isVerifiedBooking, true));
    if (facilityId && !Number.isNaN(facilityId)) {
      conditions.push(eq(feedbackTable.facilityId, facilityId));
    }
    if (reviewedUserId && !Number.isNaN(reviewedUserId)) {
      conditions.push(eq(feedbackTable.reviewedUserId, reviewedUserId));
    }
    if (q) conditions.push(ilike(feedbackTable.comment, `%${q}%`));

    const order =
      sort === "oldest"
        ? asc(feedbackTable.createdAt)
        : sort === "highest"
          ? desc(feedbackTable.overallRating)
          : sort === "lowest"
            ? asc(feedbackTable.overallRating)
            : desc(feedbackTable.createdAt);

    const where = and(...conditions);
    const rows = await db
      .select({
        review: feedbackTable,
        reviewerName: usersTable.name,
      })
      .from(feedbackTable)
      .leftJoin(usersTable, eq(feedbackTable.reviewerUserId, usersTable.id))
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackTable)
      .where(where);

    return NextResponse.json({
      items: rows.map((r) => ({
        ...serializeFeedback(r.review),
        reviewerName: r.reviewerName,
      })),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
