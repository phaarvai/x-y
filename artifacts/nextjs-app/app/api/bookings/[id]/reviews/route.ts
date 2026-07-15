import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingsTable, feedbackTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import {
  getReviewSettings,
  recalculateRatingSummary,
  serializeFeedback,
  rateLimitReview,
} from "@/lib/reviews";

const RATING = z.number().int().min(1).max(5);

const createReviewBody = z.object({
  reviewedUserId: z.number().int().positive().optional(),
  overallRating: RATING,
  qualityRating: RATING,
  communicationRating: RATING,
  timelinessRating: RATING,
  comment: z.string().max(1000).optional().nullable(),
});

function isParticipant(userId: number, booking: typeof bookingsTable.$inferSelect) {
  return booking.visionaryUserId === userId || booking.manufacturerUserId === userId;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    if (!rateLimitReview(user.id)) {
      return NextResponse.json(
        { error: "Too many review submissions. Please wait." },
        { status: 429 },
      );
    }

    const bookingId = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const settings = await getReviewSettings();
    const parsed = createReviewBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.comment && parsed.data.comment.length > settings.maxCommentLength) {
      return NextResponse.json(
        { error: `Comment exceeds ${settings.maxCommentLength} characters` },
        { status: 400 },
      );
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "DELETED" || booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Deleted or cancelled bookings cannot receive reviews" },
        { status: 409 },
      );
    }
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Only completed bookings can be reviewed" },
        { status: 409 },
      );
    }
    if (!isParticipant(user.id, booking)) {
      return NextResponse.json(
        { error: "Only booking participants can submit reviews" },
        { status: 403 },
      );
    }

    const reviewedUserId =
      parsed.data.reviewedUserId ??
      (booking.visionaryUserId === user.id
        ? booking.manufacturerUserId
        : booking.visionaryUserId);

    if (reviewedUserId === user.id) {
      return NextResponse.json({ error: "Users cannot review themselves" }, { status: 400 });
    }
    if (
      reviewedUserId !== booking.visionaryUserId &&
      reviewedUserId !== booking.manufacturerUserId
    ) {
      return NextResponse.json(
        { error: "Reviewed user must be a booking participant" },
        { status: 400 },
      );
    }

    const [dup] = await db
      .select()
      .from(feedbackTable)
      .where(
        and(eq(feedbackTable.bookingId, bookingId), eq(feedbackTable.reviewerUserId, user.id)),
      )
      .limit(1);
    if (dup) {
      return NextResponse.json({ error: "You already reviewed this booking" }, { status: 409 });
    }

    const publishNow = !settings.moderationEnabled;
    const status = publishNow ? "PUBLISHED" : "PENDING";
    const moderationStatus = publishNow ? "APPROVED" : "PENDING";

    try {
      const [review] = await db
        .insert(feedbackTable)
        .values({
          bookingId,
          requestId: booking.requestId ?? null,
          facilityId: booking.facilityId ?? null,
          reviewerUserId: user.id,
          reviewedUserId,
          overallRating: parsed.data.overallRating,
          qualityRating: parsed.data.qualityRating,
          communicationRating: parsed.data.communicationRating,
          timelinessRating: parsed.data.timelinessRating,
          comment: parsed.data.comment ? escapeHtml(parsed.data.comment.trim()) : null,
          status,
          moderationStatus,
          isVerifiedBooking: true,
          ...(publishNow ? { moderatedAt: new Date(), moderatedBy: null } : {}),
        })
        .returning();

      if (publishNow) {
        await recalculateRatingSummary("USER", reviewedUserId);
        if (booking.facilityId) await recalculateRatingSummary("FACILITY", booking.facilityId);
      }

      await writeAuditLog({
        actorUserId: user.id,
        action: "REVIEW_SUBMITTED",
        entityType: "Feedback",
        entityId: review.id,
        ipAddress: clientIp(req),
      });

      await createNotification({
        userId: reviewedUserId,
        eventType: "REVIEW_SUBMITTED",
        title: "New review submitted",
        description: publishNow
          ? `You received a ${parsed.data.overallRating}-star review.`
          : "A review about you is pending moderation.",
        relatedType: "Feedback",
        relatedId: review.id,
        category: "REVIEW",
      });

      return NextResponse.json(serializeFeedback(review), { status: 201 });
    } catch {
      return NextResponse.json({ error: "Duplicate review not allowed" }, { status: 409 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const bookingId = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!isParticipant(user.id, booking) && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.bookingId, bookingId))
      .orderBy(desc(feedbackTable.createdAt));

    const mine = rows.find((r) => r.reviewerUserId === user.id) ?? null;
    return NextResponse.json({
      items: rows.map(serializeFeedback),
      myReview: mine ? serializeFeedback(mine) : null,
      canReview: booking.status === "COMPLETED" && !mine && isParticipant(user.id, booking),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
