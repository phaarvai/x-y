import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ratingSummariesTable } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { recalculateRatingSummary, parseDistribution } from "@/lib/reviews";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let [summary] = await db
      .select()
      .from(ratingSummariesTable)
      .where(
        and(
          eq(ratingSummariesTable.entityType, "FACILITY"),
          eq(ratingSummariesTable.entityId, id),
        ),
      )
      .limit(1);

    if (!summary) {
      summary = await recalculateRatingSummary("FACILITY", id);
    }

    return NextResponse.json({
      averageRating: Number(summary.averageRating),
      totalReviews: summary.reviewCount,
      ratingDistribution: parseDistribution(summary.distribution),
      categoryAverages: {
        quality: Number(summary.qualityAvg ?? 0),
        communication: Number(summary.communicationAvg ?? 0),
        timeliness: Number(summary.timelinessAvg ?? 0),
        overall: Number(summary.averageRating),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
