import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackTable, reportedReviewsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";

const REPORT_REASONS = [
  "SPAM",
  "ABUSE",
  "FALSE_INFORMATION",
  "HARASSMENT",
  "OFFENSIVE_CONTENT",
  "OTHER",
] as const;

const reportReviewBody = z.object({
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(1000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const parsed = reportReviewBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [review] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.id, id))
      .limit(1);
    if (!review || review.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (review.reviewerUserId === user.id) {
      return NextResponse.json({ error: "Cannot report your own review" }, { status: 400 });
    }

    try {
      const [report] = await db
        .insert(reportedReviewsTable)
        .values({
          reviewId: id,
          reportedBy: user.id,
          reason: parsed.data.reason,
          description: parsed.data.description ? escapeHtml(parsed.data.description) : null,
          status: "OPEN",
        })
        .returning();

      await db
        .update(feedbackTable)
        .set({ isReported: true, updatedAt: new Date() })
        .where(eq(feedbackTable.id, id));

      await writeAuditLog({
        actorUserId: user.id,
        action: "REVIEW_REPORTED",
        entityType: "Feedback",
        entityId: id,
        ipAddress: clientIp(req),
      });

      await createNotification({
        userId: review.reviewerUserId,
        eventType: "REVIEW_REPORTED",
        title: "Your review was reported",
        description: "An admin will review the report.",
        relatedType: "Feedback",
        relatedId: id,
        category: "REVIEW",
      });

      return NextResponse.json(
        {
          ...report,
          createdAt: report.createdAt.toISOString(),
          updatedAt: report.updatedAt.toISOString(),
        },
        { status: 201 },
      );
    } catch {
      return NextResponse.json({ error: "You already reported this review" }, { status: 409 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
