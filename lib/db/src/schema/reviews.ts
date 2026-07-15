import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bookingsTable } from "./legal";

/**
 * EPIC 12 — Reviews, Ratings, Trust & Safety
 */

export const platformReviewSettingsTable = pgTable("platform_review_settings", {
  id: serial("id").primaryKey(),
  moderationEnabled: boolean("moderation_enabled").notNull().default(true),
  maxCommentLength: integer("max_comment_length").notNull().default(1000),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlatformReviewSettings = typeof platformReviewSettingsTable.$inferSelect;

/** Feedback / reviews (XFY-059) */
export const feedbackTable = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .references(() => bookingsTable.id)
      .notNull(),
    requestId: integer("request_id"),
    facilityId: integer("facility_id"),
    reviewerUserId: integer("reviewer_user_id")
      .references(() => usersTable.id)
      .notNull(),
    reviewedUserId: integer("reviewed_user_id")
      .references(() => usersTable.id)
      .notNull(),
    overallRating: integer("overall_rating").notNull(),
    qualityRating: integer("quality_rating").notNull(),
    communicationRating: integer("communication_rating").notNull(),
    timelinessRating: integer("timeliness_rating").notNull(),
    comment: text("comment"),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    moderationStatus: varchar("moderation_status", { length: 32 }).notNull().default("PENDING"),
    moderationNotes: text("moderation_notes"),
    moderatedBy: integer("moderated_by").references(() => usersTable.id),
    moderatedAt: timestamp("moderated_at"),
    isReported: boolean("is_reported").notNull().default(false),
    isVerifiedBooking: boolean("is_verified_booking").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_feedback_booking_reviewer").on(t.bookingId, t.reviewerUserId),
    index("idx_feedback_booking").on(t.bookingId),
    index("idx_feedback_facility").on(t.facilityId),
    index("idx_feedback_reviewer").on(t.reviewerUserId),
    index("idx_feedback_reviewed").on(t.reviewedUserId),
    index("idx_feedback_overall").on(t.overallRating),
    index("idx_feedback_status").on(t.status),
  ],
);

export type Feedback = typeof feedbackTable.$inferSelect;

/** Aggregate rating cache for facilities / users */
export const ratingSummariesTable = pgTable(
  "rating_summaries",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id").notNull(),
    averageRating: numeric("average_rating", { precision: 3, scale: 2 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    qualityAvg: numeric("quality_avg", { precision: 3, scale: 2 }).default("0"),
    communicationAvg: numeric("communication_avg", { precision: 3, scale: 2 }).default("0"),
    timelinessAvg: numeric("timeliness_avg", { precision: 3, scale: 2 }).default("0"),
    distribution: text("distribution"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_rating_summary_entity").on(t.entityType, t.entityId),
    index("idx_rating_summary_entity").on(t.entityType, t.entityId),
  ],
);

export type RatingSummary = typeof ratingSummariesTable.$inferSelect;

export const reportedReviewsTable = pgTable(
  "reported_reviews",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .references(() => feedbackTable.id)
      .notNull(),
    reportedBy: integer("reported_by")
      .references(() => usersTable.id)
      .notNull(),
    reason: varchar("reason", { length: 64 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("OPEN"),
    handledBy: integer("handled_by").references(() => usersTable.id),
    handledAt: timestamp("handled_at"),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_reported_review").on(t.reviewId),
    index("idx_reported_by").on(t.reportedBy),
    index("idx_reported_status").on(t.status),
    uniqueIndex("uq_report_review_user").on(t.reviewId, t.reportedBy),
  ],
);

export type ReportedReview = typeof reportedReviewsTable.$inferSelect;

/** Verified badge system (XFY-062) */
export const verificationsTable = pgTable(
  "verifications",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id").notNull(),
    verificationType: varchar("verification_type", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    verifiedBy: integer("verified_by").references(() => usersTable.id),
    verificationReason: text("verification_reason"),
    notes: text("notes"),
    verifiedAt: timestamp("verified_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_verification_entity").on(t.entityType, t.entityId),
    index("idx_verification_status").on(t.status),
    index("idx_verification_type").on(t.verificationType),
  ],
);

export type Verification = typeof verificationsTable.$inferSelect;

/** Immutable verification history */
export const verificationHistoryTable = pgTable(
  "verification_history",
  {
    id: serial("id").primaryKey(),
    verificationId: integer("verification_id")
      .references(() => verificationsTable.id)
      .notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    performedBy: integer("performed_by").references(() => usersTable.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_verification_history_ver").on(t.verificationId)],
);

export type VerificationHistory = typeof verificationHistoryTable.$inferSelect;
