import { Router } from "express";
import {
  db,
  bookingsTable,
  feedbackTable,
  reportedReviewsTable,
  ratingSummariesTable,
  usersTable,
  platformReviewSettingsTable,
} from "@workspace/db";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import { createReviewBody, reportReviewBody, moderateReviewBody, reviewSettingsBody } from "../lib/review-schemas";
import {
  getReviewSettings,
  recalculateRatingSummary,
  serializeFeedback,
  parseDistribution,
} from "../lib/review-service";

const router = Router();

const recentSubmits = new Map<number, number>();
function rateLimitReview(userId: number): boolean {
  const now = Date.now();
  const last = recentSubmits.get(userId) ?? 0;
  if (now - last < 5000) return false;
  recentSubmits.set(userId, now);
  return true;
}

async function loadBooking(id: number) {
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  return b ?? null;
}

function isParticipant(userId: number, booking: typeof bookingsTable.$inferSelect) {
  return booking.visionaryUserId === userId || booking.manufacturerUserId === userId;
}

router.post("/bookings/:bookingId/reviews", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!rateLimitReview(user.id)) {
    return res.status(429).json({ error: "Too many review submissions. Please wait." });
  }

  const bookingId = parseInt(req.params.bookingId, 10);
  if (Number.isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking id" });

  const settings = await getReviewSettings();
  const parsed = createReviewBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  if (parsed.data.comment && parsed.data.comment.length > settings.maxCommentLength) {
    return res.status(400).json({ error: `Comment exceeds ${settings.maxCommentLength} characters` });
  }

  const booking = await loadBooking(bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status === "DELETED" || booking.status === "CANCELLED") {
    return res.status(409).json({ error: "Deleted or cancelled bookings cannot receive reviews" });
  }
  if (booking.status !== "COMPLETED") {
    return res.status(409).json({ error: "Only completed bookings can be reviewed" });
  }
  if (!isParticipant(user.id, booking)) {
    return res.status(403).json({ error: "Only booking participants can submit reviews" });
  }

  const reviewedUserId =
    parsed.data.reviewedUserId ??
    (booking.visionaryUserId === user.id ? booking.manufacturerUserId : booking.visionaryUserId);

  if (reviewedUserId === user.id) {
    return res.status(400).json({ error: "Users cannot review themselves" });
  }
  if (
    reviewedUserId !== booking.visionaryUserId &&
    reviewedUserId !== booking.manufacturerUserId
  ) {
    return res.status(400).json({ error: "Reviewed user must be a booking participant" });
  }

  const [dup] = await db
    .select()
    .from(feedbackTable)
    .where(and(eq(feedbackTable.bookingId, bookingId), eq(feedbackTable.reviewerUserId, user.id)))
    .limit(1);
  if (dup) return res.status(409).json({ error: "You already reviewed this booking" });

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
        ...(publishNow
          ? { moderatedAt: new Date(), moderatedBy: null }
          : {}),
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

    return res.status(201).json(serializeFeedback(review));
  } catch {
    return res.status(409).json({ error: "Duplicate review not allowed" });
  }
});

router.get("/bookings/:bookingId/reviews", async (req, res) => {
  const bookingId = parseInt(req.params.bookingId, 10);
  if (Number.isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking id" });

  const user = await requireUser(req, res);
  if (!user) return;
  const booking = await loadBooking(bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!isParticipant(user.id, booking) && !isAdmin(user)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const rows = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.bookingId, bookingId))
    .orderBy(desc(feedbackTable.createdAt));

  const mine = rows.find((r) => r.reviewerUserId === user.id) ?? null;
  return res.status(200).json({
    items: rows.map(serializeFeedback),
    myReview: mine ? serializeFeedback(mine) : null,
    canReview: booking.status === "COMPLETED" && !mine && isParticipant(user.id, booking),
  });
});

router.get("/users/:userId/reviews", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

  const where = and(eq(feedbackTable.reviewedUserId, userId), eq(feedbackTable.status, "PUBLISHED"));
  const rows = await db
    .select()
    .from(feedbackTable)
    .where(where)
    .orderBy(desc(feedbackTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(feedbackTable).where(where);

  return res.status(200).json({ items: rows.map(serializeFeedback), total: count, page, limit });
});

router.get("/facilities/:facilityId/reviews", async (req, res) => {
  const facilityId = parseInt(req.params.facilityId, 10);
  if (Number.isNaN(facilityId)) return res.status(400).json({ error: "Invalid facility id" });

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const where = and(eq(feedbackTable.facilityId, facilityId), eq(feedbackTable.status, "PUBLISHED"));
  const rows = await db
    .select()
    .from(feedbackTable)
    .where(where)
    .orderBy(desc(feedbackTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(feedbackTable).where(where);

  return res.status(200).json({ items: rows.map(serializeFeedback), total: count, page, limit });
});

router.get("/facilities/:id/rating-summary", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  let [summary] = await db
    .select()
    .from(ratingSummariesTable)
    .where(and(eq(ratingSummariesTable.entityType, "FACILITY"), eq(ratingSummariesTable.entityId, id)))
    .limit(1);

  if (!summary) {
    summary = await recalculateRatingSummary("FACILITY", id);
  }

  return res.status(200).json({
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
});

router.get("/users/:id/rating-summary", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  let [summary] = await db
    .select()
    .from(ratingSummariesTable)
    .where(and(eq(ratingSummariesTable.entityType, "USER"), eq(ratingSummariesTable.entityId, id)))
    .limit(1);
  if (!summary) summary = await recalculateRatingSummary("USER", id);

  return res.status(200).json({
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
});

router.get("/reviews", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const sort = String(req.query.sort || "newest");
  const rating = req.query.rating ? parseInt(String(req.query.rating), 10) : undefined;
  const verifiedOnly = req.query.verified === "true";
  const q = req.query.q ? String(req.query.q) : undefined;
  const facilityId = req.query.facilityId ? parseInt(String(req.query.facilityId), 10) : undefined;
  const reviewedUserId = req.query.reviewedUserId
    ? parseInt(String(req.query.reviewedUserId), 10)
    : undefined;

  const conditions = [eq(feedbackTable.status, "PUBLISHED")];
  if (rating && rating >= 1 && rating <= 5) conditions.push(eq(feedbackTable.overallRating, rating));
  if (verifiedOnly) conditions.push(eq(feedbackTable.isVerifiedBooking, true));
  if (facilityId && !Number.isNaN(facilityId)) conditions.push(eq(feedbackTable.facilityId, facilityId));
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

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(feedbackTable).where(where);

  return res.status(200).json({
    items: rows.map((r) => ({
      ...serializeFeedback(r.review),
      reviewerName: r.reviewerName,
    })),
    total: count,
    page,
    limit,
  });
});

router.post("/reviews/:id/report", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = reportReviewBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [review] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id)).limit(1);
  if (!review || review.status !== "PUBLISHED") {
    return res.status(404).json({ error: "Review not found" });
  }
  if (review.reviewerUserId === user.id) {
    return res.status(400).json({ error: "Cannot report your own review" });
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

    return res.status(201).json({
      ...report,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch {
    return res.status(409).json({ error: "You already reported this review" });
  }
});

// —— Admin moderation ——
router.get("/admin/reviews", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : "PENDING";

  const where = eq(feedbackTable.status, status);
  const rows = await db
    .select()
    .from(feedbackTable)
    .where(where)
    .orderBy(desc(feedbackTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(feedbackTable).where(where);

  return res.status(200).json({ items: rows.map(serializeFeedback), total: count, page, limit });
});

router.patch("/admin/reviews/:id/approve", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = moderateReviewBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [existing] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Review not found" });

  const [updated] = await db
    .update(feedbackTable)
    .set({
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
      moderationNotes: parsed.data.notes ? escapeHtml(parsed.data.notes) : existing.moderationNotes,
      moderatedBy: user.id,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feedbackTable.id, id))
    .returning();

  await recalculateRatingSummary("USER", updated.reviewedUserId);
  if (updated.facilityId) await recalculateRatingSummary("FACILITY", updated.facilityId);

  await writeAuditLog({
    actorUserId: user.id,
    action: "REVIEW_APPROVED",
    entityType: "Feedback",
    entityId: id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: updated.reviewerUserId,
    eventType: "REVIEW_APPROVED",
    title: "Review approved",
    description: "Your review is now published.",
    relatedType: "Feedback",
    relatedId: id,
    category: "REVIEW",
  });

  return res.status(200).json(serializeFeedback(updated));
});

router.patch("/admin/reviews/:id/reject", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = moderateReviewBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [updated] = await db
    .update(feedbackTable)
    .set({
      status: "REJECTED",
      moderationStatus: "REJECTED",
      moderationNotes: parsed.data.notes ? escapeHtml(parsed.data.notes) : null,
      moderatedBy: user.id,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feedbackTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Review not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "REVIEW_REJECTED",
    entityType: "Feedback",
    entityId: id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: updated.reviewerUserId,
    eventType: "REVIEW_REJECTED",
    title: "Review rejected",
    description: parsed.data.notes || "Your review did not meet guidelines.",
    relatedType: "Feedback",
    relatedId: id,
    category: "REVIEW",
  });

  return res.status(200).json(serializeFeedback(updated));
});

router.patch("/admin/reviews/:id/hide", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Review not found" });

  const [updated] = await db
    .update(feedbackTable)
    .set({ status: "HIDDEN", updatedAt: new Date(), moderatedBy: user.id, moderatedAt: new Date() })
    .where(eq(feedbackTable.id, id))
    .returning();

  await recalculateRatingSummary("USER", updated.reviewedUserId);
  if (updated.facilityId) await recalculateRatingSummary("FACILITY", updated.facilityId);

  await writeAuditLog({
    actorUserId: user.id,
    action: "REVIEW_HIDDEN",
    entityType: "Feedback",
    entityId: id,
    ipAddress: clientIp(req),
  });
  await createNotification({
    userId: updated.reviewerUserId,
    eventType: "REVIEW_HIDDEN",
    title: "Review hidden",
    description: "An admin hid your review.",
    relatedType: "Feedback",
    relatedId: id,
    category: "REVIEW",
  });

  return res.status(200).json(serializeFeedback(updated));
});

router.patch("/admin/reviews/:id/restore", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(feedbackTable)
    .set({ status: "PUBLISHED", moderationStatus: "APPROVED", updatedAt: new Date() })
    .where(eq(feedbackTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Review not found" });

  await recalculateRatingSummary("USER", updated.reviewedUserId);
  if (updated.facilityId) await recalculateRatingSummary("FACILITY", updated.facilityId);

  await writeAuditLog({
    actorUserId: user.id,
    action: "REVIEW_RESTORED",
    entityType: "Feedback",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeFeedback(updated));
});

router.get("/admin/review-reports", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const status = req.query.status ? String(req.query.status) : undefined;
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

  return res.status(200).json({
    items: rows.map((r) => ({
      ...r,
      handledAt: r.handledAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    page,
    limit,
  });
});

router.get("/admin/review-settings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const settings = await getReviewSettings();
  return res.status(200).json(settings);
});

router.patch("/admin/review-settings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const parsed = reviewSettingsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const settings = await getReviewSettings();
  const [updated] = await db
    .update(platformReviewSettingsTable)
    .set({
      ...(parsed.data.moderationEnabled != null
        ? { moderationEnabled: parsed.data.moderationEnabled }
        : {}),
      ...(parsed.data.maxCommentLength != null
        ? { maxCommentLength: parsed.data.maxCommentLength }
        : {}),
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(platformReviewSettingsTable.id, settings.id))
    .returning();

  return res.status(200).json(updated);
});

export default router;
