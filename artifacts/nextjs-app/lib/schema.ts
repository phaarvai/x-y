import {
  pgTable,
  text,
  serial,
  timestamp,
  varchar,
  integer,
  boolean,
  numeric,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  preferredLanguage: varchar("preferred_language", { length: 10 }).notNull().default("en"),
  primaryRole: varchar("primary_role", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  identityVerificationStatus: varchar("identity_verification_status", { length: 32 })
    .notNull()
    .default("UNVERIFIED"),
  industry: varchar("industry", { length: 128 }),
  location: varchar("location", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  organization: varchar("organization", { length: 255 }),
  bio: text("bio"),
  profileStatus: varchar("profile_status", { length: 32 }).notNull().default("PENDING_PROFILE"),
  profileCompletedAt: timestamp("profile_completed_at"),
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
  emailVerifiedAt: timestamp("email_verified_at"),
  preferredCurrency: varchar("preferred_currency", { length: 3 }).default("USD"),
  preferredCountry: varchar("preferred_country", { length: 100 }),
  preferredRegion: varchar("preferred_region", { length: 100 }),
  preferredCity: varchar("preferred_city", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  token: text("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  visionaryUserId: integer("visionary_user_id").references(() => usersTable.id).notNull(),
  manufacturerUserId: integer("manufacturer_user_id").references(() => usersTable.id).notNull(),
  facilityId: integer("facility_id"),
  inventoryId: integer("inventory_id"),
  requestId: integer("request_id"),
  status: varchar("status", { length: 32 }).notNull().default("CONFIRMED"),
  agreedPrice: numeric("agreed_price", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("INR"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_bookings_visionary").on(t.visionaryUserId),
  index("idx_bookings_manufacturer").on(t.manufacturerUserId),
  index("idx_bookings_status").on(t.status),
]);

export const legalServiceProvidersTable = pgTable("legal_service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  providerType: varchar("provider_type", { length: 64 }).notNull(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  bio: text("bio"),
  yearsExperience: integer("years_experience").default(0),
  qualifications: text("qualifications"),
  licenses: text("licenses"),
  certifications: text("certifications"),
  serviceCategories: text("service_categories"),
  languages: text("languages"),
  location: varchar("location", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  serviceRadius: integer("service_radius"),
  pricingType: varchar("pricing_type", { length: 32 }).default("HOURLY"),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  fixedPrice: numeric("fixed_price", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("INR"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  website: varchar("website", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  profileImage: text("profile_image"),
  credentialsUrl: text("credentials_url"),
  identityVerificationStatus: varchar("identity_verification_status", { length: 32 }).notNull().default("UNVERIFIED"),
  isPublished: boolean("is_published").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uq_legal_provider_user").on(t.userId),
  index("idx_legal_provider_type").on(t.providerType),
  index("idx_legal_provider_published").on(t.isPublished),
]);

export const contractTemplatesTable = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  templateContent: text("template_content").notNull(),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contractTemplateVersionsTable = pgTable("contract_template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => contractTemplatesTable.id).notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  changeLog: text("change_log"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingLegalDocumentsTable = pgTable("booking_legal_documents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookingsTable.id).notNull(),
  templateId: integer("template_id").references(() => contractTemplatesTable.id),
  documentTitle: varchar("document_title", { length: 255 }).notNull(),
  documentUrl: text("document_url"),
  documentContent: text("document_content"),
  version: integer("version").notNull().default(1),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  requiresAcceptance: boolean("requires_acceptance").notNull().default(true),
  requiredPartyRoles: text("required_party_roles").default("VISIONARY,MANUFACTURER"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agreementAcceptancesTable = pgTable("agreement_acceptances", {
  id: serial("id").primaryKey(),
  bookingLegalDocumentId: integer("booking_legal_document_id").references(() => bookingLegalDocumentsTable.id).notNull(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  accepted: boolean("accepted").notNull().default(true),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  acceptedIp: varchar("accepted_ip", { length: 64 }),
  acceptedUserAgent: text("accepted_user_agent"),
  digitalSignature: text("digital_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_acceptance_doc_user").on(t.bookingLegalDocumentId, t.userId)]);

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookingsTable.id).notNull(),
  openedBy: integer("opened_by").references(() => usersTable.id).notNull(),
  againstUser: integer("against_user").references(() => usersTable.id),
  category: varchar("category", { length: 64 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("OPEN"),
  priority: varchar("priority", { length: 16 }).notNull().default("NORMAL"),
  resolutionNotes: text("resolution_notes"),
  closedBy: integer("closed_by").references(() => usersTable.id),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const disputeEvidenceTable = pgTable("dispute_evidence", {
  id: serial("id").primaryKey(),
  disputeId: integer("dispute_id").references(() => disputesTable.id).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 128 }).notNull(),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").references(() => usersTable.id),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id"),
    metadata: text("metadata"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_actor").on(t.actorUserId),
    index("idx_audit_entity").on(t.entityType, t.entityId),
    index("idx_audit_action").on(t.action),
    index("idx_audit_created").on(t.createdAt),
  ],
);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  category: varchar("category", { length: 32 }).notNull().default("LEGAL"),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  relatedType: varchar("related_type", { length: 64 }),
  relatedId: integer("related_id"),
  status: varchar("status", { length: 16 }).notNull().default("UNREAD"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** EPIC 11 — Payments */
export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id"),
  bookingId: integer("booking_id").references(() => bookingsTable.id),
  payerUserId: integer("payer_user_id").references(() => usersTable.id).notNull(),
  payeeUserId: integer("payee_user_id").references(() => usersTable.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 14, scale: 2 }).default("0"),
  commissionAmount: numeric("commission_amount", { precision: 14, scale: 2 }).default("0"),
  commissionType: varchar("commission_type", { length: 32 }).default("PERCENTAGE"),
  commissionRate: numeric("commission_rate", { precision: 8, scale: 4 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  paymentMethod: varchar("payment_method", { length: 64 }),
  paymentProvider: varchar("payment_provider", { length: 64 }),
  paymentProviderReference: varchar("payment_provider_reference", { length: 255 }),
  referenceNumber: varchar("reference_number", { length: 128 }),
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  updatedByAdmin: integer("updated_by_admin").references(() => usersTable.id),
  receiptUrl: text("receipt_url"),
  invoiceUrl: text("invoice_url"),
  checkoutSessionId: varchar("checkout_session_id", { length: 255 }),
  webhookProcessedAt: timestamp("webhook_processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_txn_booking").on(t.bookingId),
  index("idx_txn_request").on(t.requestId),
  index("idx_txn_payer").on(t.payerUserId),
  index("idx_txn_payee").on(t.payeeUserId),
  index("idx_txn_status").on(t.status),
  index("idx_txn_date").on(t.transactionDate),
]);

export const transactionStatusHistoryTable = pgTable("transaction_status_history", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactionsTable.id).notNull(),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }).notNull(),
  changedBy: integer("changed_by").references(() => usersTable.id),
  notes: text("notes"),
  source: varchar("source", { length: 32 }).notNull().default("SYSTEM"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentWebhookEventsTable = pgTable("payment_webhook_events", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 128 }),
  payloadHash: varchar("payload_hash", { length: 128 }),
  transactionId: integer("transaction_id").references(() => transactionsTable.id),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_webhook_provider_event").on(t.provider, t.eventId)]);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  billingCycle: varchar("billing_cycle", { length: 32 }).notNull().default("MONTHLY"),
  commissionType: varchar("commission_type", { length: 32 }).notNull().default("PERCENTAGE"),
  commissionValue: numeric("commission_value", { precision: 10, scale: 4 }).notNull().default("10"),
  listingLimit: integer("listing_limit").default(10),
  featuredListings: integer("featured_listings").default(0),
  prioritySupport: boolean("priority_support").notNull().default(false),
  adCredits: integer("ad_credits").notNull().default(0),
  storageLimit: integer("storage_limit").default(1024),
  features: text("features"),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  isRecommended: boolean("is_recommended").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSubscriptionsTable = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlansTable.id).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  renewalDate: timestamp("renewal_date"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  paymentTransactionId: integer("payment_transaction_id").references(() => transactionsTable.id),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const advertisementsTable = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => usersTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  destinationUrl: text("destination_url").notNull(),
  placement: varchar("placement", { length: 64 }).notNull(),
  category: varchar("category", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).default("0"),
  remainingCredits: integer("remaining_credits").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_ad_owner").on(t.ownerUserId),
  index("idx_ad_status").on(t.status),
  index("idx_ad_placement").on(t.placement),
]);

export const advertisementAnalyticsTable = pgTable("advertisement_analytics", {
  id: serial("id").primaryKey(),
  advertisementId: integer("advertisement_id").references(() => advertisementsTable.id).notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  ctr: numeric("ctr", { precision: 8, scale: 4 }).default("0"),
  lastViewedAt: timestamp("last_viewed_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_ad_analytics_ad").on(t.advertisementId)]);

export const advertisementEventsTable = pgTable("advertisement_events", {
  id: serial("id").primaryKey(),
  advertisementId: integer("advertisement_id").references(() => advertisementsTable.id).notNull(),
  eventType: varchar("event_type", { length: 16 }).notNull(),
  visitorHash: varchar("visitor_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionSettingsTable = pgTable("commission_settings", {
  id: serial("id").primaryKey(),
  defaultCommissionType: varchar("default_commission_type", { length: 32 }).notNull().default("PERCENTAGE"),
  defaultCommissionValue: numeric("default_commission_value", { precision: 10, scale: 4 }).notNull().default("10"),
  taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("18"),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** EPIC 12 — Reviews & Trust */
export const platformReviewSettingsTable = pgTable("platform_review_settings", {
  id: serial("id").primaryKey(),
  moderationEnabled: boolean("moderation_enabled").notNull().default(true),
  maxCommentLength: integer("max_comment_length").notNull().default(1000),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookingsTable.id).notNull(),
  requestId: integer("request_id"),
  facilityId: integer("facility_id"),
  reviewerUserId: integer("reviewer_user_id").references(() => usersTable.id).notNull(),
  reviewedUserId: integer("reviewed_user_id").references(() => usersTable.id).notNull(),
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
}, (t) => [
  uniqueIndex("uq_feedback_booking_reviewer").on(t.bookingId, t.reviewerUserId),
  index("idx_feedback_booking").on(t.bookingId),
  index("idx_feedback_facility").on(t.facilityId),
  index("idx_feedback_reviewer").on(t.reviewerUserId),
  index("idx_feedback_reviewed").on(t.reviewedUserId),
  index("idx_feedback_overall").on(t.overallRating),
  index("idx_feedback_status").on(t.status),
]);

export const ratingSummariesTable = pgTable("rating_summaries", {
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
}, (t) => [uniqueIndex("uq_rating_summary_entity").on(t.entityType, t.entityId)]);

export const reportedReviewsTable = pgTable("reported_reviews", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => feedbackTable.id).notNull(),
  reportedBy: integer("reported_by").references(() => usersTable.id).notNull(),
  reason: varchar("reason", { length: 64 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("OPEN"),
  handledBy: integer("handled_by").references(() => usersTable.id),
  handledAt: timestamp("handled_at"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_report_review_user").on(t.reviewId, t.reportedBy)]);

export const verificationsTable = pgTable("verifications", {
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
}, (t) => [
  index("idx_verification_entity").on(t.entityType, t.entityId),
  index("idx_verification_status").on(t.status),
]);

export const verificationHistoryTable = pgTable("verification_history", {
  id: serial("id").primaryKey(),
  verificationId: integer("verification_id").references(() => verificationsTable.id).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }).notNull(),
  performedBy: integer("performed_by").references(() => usersTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * EPIC 13 — Vendor, Labor, Logistics, Investor, Market Lead Marketplace
 */

export const serviceProviderProfilesTable = pgTable(
  "service_provider_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    providerType: varchar("provider_type", { length: 64 }).notNull(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    serviceCategories: text("service_categories"),
    description: text("description"),
    businessType: varchar("business_type", { length: 128 }),
    experienceYears: integer("experience_years").default(0),
    certifications: text("certifications"),
    licenses: text("licenses"),
    location: varchar("location", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    serviceableAreas: text("serviceable_areas"),
    pricingModel: varchar("pricing_model", { length: 64 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 32 }),
    website: varchar("website", { length: 255 }),
    socialLinks: text("social_links"),
    verificationStatus: varchar("verification_status", { length: 32 }).notNull().default("UNVERIFIED"),
    rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    isPublished: boolean("is_published").notNull().default(false),
    profileImage: text("profile_image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_service_provider_user_type").on(t.userId, t.providerType),
    index("idx_sp_provider_type").on(t.providerType),
    index("idx_sp_city").on(t.city),
    index("idx_sp_country").on(t.country),
    index("idx_sp_verification").on(t.verificationStatus),
    index("idx_sp_published").on(t.isPublished),
  ],
);

export type ServiceProviderProfile = typeof serviceProviderProfilesTable.$inferSelect;

export const vendorMaterialsTable = pgTable(
  "vendor_materials",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    materialName: varchar("material_name", { length: 255 }).notNull(),
    category: varchar("category", { length: 128 }).notNull(),
    subCategory: varchar("sub_category", { length: 128 }),
    description: text("description"),
    unit: varchar("unit", { length: 32 }).notNull().default("KG"),
    minimumOrderQuantity: numeric("minimum_order_quantity", { precision: 14, scale: 2 }),
    availableQuantity: numeric("available_quantity", { precision: 14, scale: 2 }),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    leadTime: varchar("lead_time", { length: 64 }),
    availabilityStatus: varchar("availability_status", { length: 32 }).notNull().default("AVAILABLE"),
    location: varchar("location", { length: 255 }),
    deliveryOptions: text("delivery_options"),
    images: text("images"),
    specifications: text("specifications"),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vendor_material_provider").on(t.providerId),
    index("idx_vendor_material_category").on(t.category),
    index("idx_vendor_material_availability").on(t.availabilityStatus),
  ],
);

export type VendorMaterial = typeof vendorMaterialsTable.$inferSelect;

export const vendorInquiriesTable = pgTable(
  "vendor_inquiries",
  {
    id: serial("id").primaryKey(),
    materialId: integer("material_id").references(() => vendorMaterialsTable.id),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    inquirerUserId: integer("inquirer_user_id")
      .references(() => usersTable.id)
      .notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("OPEN"),
    conversationId: integer("conversation_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vendor_inquiry_provider").on(t.providerId),
    index("idx_vendor_inquiry_material").on(t.materialId),
  ],
);

export type VendorInquiry = typeof vendorInquiriesTable.$inferSelect;

export const laborListingsTable = pgTable(
  "labor_listings",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    workerType: varchar("worker_type", { length: 64 }).notNull(),
    skillCategory: varchar("skill_category", { length: 128 }).notNull(),
    experienceLevel: varchar("experience_level", { length: 64 }),
    workerCount: integer("worker_count").notNull().default(1),
    availability: varchar("availability", { length: 64 }).notNull().default("AVAILABLE"),
    availabilityCalendar: text("availability_calendar"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    dailyRate: numeric("daily_rate", { precision: 12, scale: 2 }),
    monthlyRate: numeric("monthly_rate", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    description: text("description"),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_labor_provider").on(t.providerId),
    index("idx_labor_skill").on(t.skillCategory),
    index("idx_labor_city").on(t.city),
    index("idx_labor_availability").on(t.availability),
  ],
);

export type LaborListing = typeof laborListingsTable.$inferSelect;

export const laborInquiriesTable = pgTable(
  "labor_inquiries",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id").references(() => laborListingsTable.id),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    inquirerUserId: integer("inquirer_user_id")
      .references(() => usersTable.id)
      .notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("OPEN"),
    responseMessage: text("response_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_labor_inquiry_provider").on(t.providerId)],
);

export type LaborInquiry = typeof laborInquiriesTable.$inferSelect;

export const logisticsServicesTable = pgTable(
  "logistics_services",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    serviceType: varchar("service_type", { length: 64 }).notNull(),
    vehicleType: varchar("vehicle_type", { length: 64 }),
    storageType: varchar("storage_type", { length: 64 }),
    capacity: varchar("capacity", { length: 128 }),
    coverageAreas: text("coverage_areas"),
    pricingModel: varchar("pricing_model", { length: 64 }),
    minimumCharge: numeric("minimum_charge", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    estimatedDelivery: varchar("estimated_delivery", { length: 128 }),
    insuranceAvailable: boolean("insurance_available").notNull().default(false),
    trackingAvailable: boolean("tracking_available").notNull().default(false),
    description: text("description"),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_logistics_provider").on(t.providerId),
    index("idx_logistics_service_type").on(t.serviceType),
  ],
);

export type LogisticsService = typeof logisticsServicesTable.$inferSelect;

export const logisticsQuotesTable = pgTable(
  "logistics_quotes",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id").references(() => logisticsServicesTable.id),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    requestId: integer("request_id"),
    requesterUserId: integer("requester_user_id")
      .references(() => usersTable.id)
      .notNull(),
    pickupLocation: varchar("pickup_location", { length: 255 }),
    dropLocation: varchar("drop_location", { length: 255 }),
    cargoDetails: text("cargo_details"),
    requestedDate: timestamp("requested_date"),
    status: varchar("status", { length: 32 }).notNull().default("REQUESTED"),
    quotedAmount: numeric("quoted_amount", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("INR"),
    providerResponse: text("provider_response"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_logistics_quote_provider").on(t.providerId),
    index("idx_logistics_quote_request").on(t.requestId),
    index("idx_logistics_quote_status").on(t.status),
  ],
);

export type LogisticsQuote = typeof logisticsQuotesTable.$inferSelect;

export const investorProfilesTable = pgTable(
  "investor_profiles",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull()
      .unique(),
    investmentInterests: text("investment_interests"),
    preferredIndustries: text("preferred_industries"),
    ticketSizeMinimum: numeric("ticket_size_minimum", { precision: 14, scale: 2 }),
    ticketSizeMaximum: numeric("ticket_size_maximum", { precision: 14, scale: 2 }),
    preferredGeographies: text("preferred_geographies"),
    investmentStages: text("investment_stages"),
    portfolioWebsite: varchar("portfolio_website", { length: 255 }),
    bio: text("bio"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_investor_provider").on(t.providerId)],
);

export type InvestorProfile = typeof investorProfilesTable.$inferSelect;

/** Project open for investment (projectId may map to booking/request/facility) */
export const projectInvestmentsTable = pgTable(
  "project_investments",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    ownerUserId: integer("owner_user_id")
      .references(() => usersTable.id)
      .notNull(),
    title: varchar("title", { length: 255 }),
    isOpenForInvestment: boolean("is_open_for_investment").notNull().default(true),
    minimumInvestment: numeric("minimum_investment", { precision: 14, scale: 2 }),
    maximumInvestment: numeric("maximum_investment", { precision: 14, scale: 2 }),
    equityOffered: numeric("equity_offered", { precision: 8, scale: 4 }),
    fundingGoal: numeric("funding_goal", { precision: 14, scale: 2 }),
    confidentialNotes: text("confidential_notes"),
    publicSummary: text("public_summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_project_investment_project").on(t.projectId),
    index("idx_project_investment_open").on(t.isOpenForInvestment),
  ],
);

export type ProjectInvestment = typeof projectInvestmentsTable.$inferSelect;

export const investorIntroductionsTable = pgTable(
  "investor_introductions",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    projectInvestmentId: integer("project_investment_id").references(() => projectInvestmentsTable.id),
    investorId: integer("investor_id")
      .references(() => usersTable.id)
      .notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    notes: text("notes"),
    ownerNotes: text("owner_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_investor_intro_project").on(t.projectId),
    index("idx_investor_intro_investor").on(t.investorId),
    index("idx_investor_intro_status").on(t.status),
    uniqueIndex("uq_investor_intro").on(t.projectId, t.investorId),
  ],
);

export type InvestorIntroduction = typeof investorIntroductionsTable.$inferSelect;

export const marketOpportunitiesTable = pgTable(
  "market_opportunities",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .references(() => serviceProviderProfilesTable.id)
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    productCategory: varchar("product_category", { length: 128 }).notNull(),
    description: text("description"),
    demandVolume: numeric("demand_volume", { precision: 14, scale: 2 }),
    unit: varchar("unit", { length: 32 }),
    geography: varchar("geography", { length: 255 }),
    timeline: varchar("timeline", { length: 128 }),
    targetPrice: numeric("target_price", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("INR"),
    contactRules: text("contact_rules"),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    moderationStatus: varchar("moderation_status", { length: 32 }).notNull().default("PENDING"),
    moderatedBy: integer("moderated_by").references(() => usersTable.id),
    moderatedAt: timestamp("moderated_at"),
    moderationNotes: text("moderation_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_market_opp_provider").on(t.providerId),
    index("idx_market_opp_category").on(t.productCategory),
    index("idx_market_opp_status").on(t.status),
    index("idx_market_opp_moderation").on(t.moderationStatus),
  ],
);

export type MarketOpportunity = typeof marketOpportunitiesTable.$inferSelect;

export const marketInterestRequestsTable = pgTable(
  "market_interest_requests",
  {
    id: serial("id").primaryKey(),
    opportunityId: integer("opportunity_id")
      .references(() => marketOpportunitiesTable.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    message: text("message"),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_market_interest_opp").on(t.opportunityId),
    uniqueIndex("uq_market_interest_user").on(t.opportunityId, t.userId),
  ],
);

export type MarketInterestRequest = typeof marketInterestRequestsTable.$inferSelect;

/** EPIC 14 — Admin Console */
export const adminRolesTable = pgTable(
  "admin_roles",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 64 }).notNull().unique(),
    description: text("description"),
    permissions: text("permissions"),
    isSystem: boolean("is_system").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_admin_roles_name").on(t.name)],
);

export const adminPermissionsTable = pgTable(
  "admin_permissions",
  {
    id: serial("id").primaryKey(),
    module: varchar("module", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_admin_perm_module_action").on(t.module, t.action)],
);

export const adminRolePermissionsTable = pgTable(
  "admin_role_permissions",
  {
    id: serial("id").primaryKey(),
    adminRoleId: integer("admin_role_id")
      .references(() => adminRolesTable.id)
      .notNull(),
    permissionId: integer("permission_id")
      .references(() => adminPermissionsTable.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_role_permission").on(t.adminRoleId, t.permissionId)],
);

export const userRoleAssignmentsTable = pgTable(
  "user_role_assignments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    adminRoleId: integer("admin_role_id")
      .references(() => adminRolesTable.id)
      .notNull(),
    assignedBy: integer("assigned_by").references(() => usersTable.id),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_user_admin_role").on(t.userId, t.adminRoleId),
    index("idx_user_role_user").on(t.userId),
  ],
);

export const listingModerationsTable = pgTable(
  "listing_moderations",
  {
    id: serial("id").primaryKey(),
    listingType: varchar("listing_type", { length: 64 }).notNull(),
    listingId: integer("listing_id").notNull(),
    ownerUserId: integer("owner_user_id").references(() => usersTable.id),
    title: varchar("title", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    reviewedBy: integer("reviewed_by").references(() => usersTable.id),
    reviewReason: text("review_reason"),
    internalNotes: text("internal_notes"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_listing_mod_type").on(t.listingType),
    index("idx_listing_mod_status").on(t.status),
    uniqueIndex("uq_listing_moderation").on(t.listingType, t.listingId),
  ],
);

export const categoriesTable = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    parentId: integer("parent_id"),
    categoryType: varchar("category_type", { length: 64 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 128 }),
    sortOrder: integer("sort_order").notNull().default(0),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_category_slug_type").on(t.slug, t.categoryType),
    index("idx_category_parent").on(t.parentId),
    index("idx_category_type").on(t.categoryType),
    index("idx_category_status").on(t.status),
  ],
);

export const supportCasesTable = pgTable(
  "support_cases",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    bookingId: integer("booking_id"),
    subject: varchar("subject", { length: 255 }).notNull(),
    description: text("description").notNull(),
    priority: varchar("priority", { length: 16 }).notNull().default("MEDIUM"),
    status: varchar("status", { length: 32 }).notNull().default("OPEN"),
    assignedAdmin: integer("assigned_admin").references(() => usersTable.id),
    resolution: text("resolution"),
    internalNotes: text("internal_notes"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_support_user").on(t.userId),
    index("idx_support_status").on(t.status),
    index("idx_support_assigned").on(t.assignedAdmin),
    index("idx_support_booking").on(t.bookingId),
  ],
);

export const userLoginHistoryTable = pgTable(
  "user_login_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    success: boolean("success").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_login_history_user").on(t.userId)],
);

/** EPIC 15 — Analytics */
export const manufacturingRequestsTable = pgTable(
  "manufacturing_requests",
  {
    id: serial("id").primaryKey(),
    visionaryUserId: integer("visionary_user_id")
      .references(() => usersTable.id)
      .notNull(),
    manufacturerUserId: integer("manufacturer_user_id").references(() => usersTable.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    industry: varchar("industry", { length: 128 }),
    category: varchar("category", { length: 128 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    budgetMin: numeric("budget_min", { precision: 14, scale: 2 }),
    budgetMax: numeric("budget_max", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("INR"),
    publishedAt: timestamp("published_at"),
    closedAt: timestamp("closed_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    requestType: varchar("request_type", { length: 32 }).notNull().default("REQUIREMENT"),
    facilityId: integer("facility_id"),
    inventoryId: integer("inventory_id"),
    bookingId: integer("booking_id"),
    quantity: integer("quantity").default(1),
    preferredStartDate: timestamp("preferred_start_date"),
    preferredEndDate: timestamp("preferred_end_date"),
    message: text("message"),
    declineReason: text("decline_reason"),
    materialSpecs: text("material_specs"),
    isConfidential: boolean("is_confidential").notNull().default(false),
    requiredMachinery: text("required_machinery"),
    requiredLabor: text("required_labor"),
    requiredMaterials: text("required_materials"),
    requiredLogistics: text("required_logistics"),
    requiredLegal: text("required_legal"),
    timelineNotes: text("timeline_notes"),
    attachmentFileIds: text("attachment_file_ids"),
  },
  (t) => [
    index("idx_mfg_req_visionary").on(t.visionaryUserId),
    index("idx_mfg_req_manufacturer").on(t.manufacturerUserId),
    index("idx_mfg_req_status").on(t.status),
    index("idx_mfg_req_industry").on(t.industry),
    index("idx_mfg_req_created").on(t.createdAt),
  ],
);

export const userFavoritesTable = pgTable(
  "user_favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id").notNull(),
    title: varchar("title", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_user_favorite").on(t.userId, t.entityType, t.entityId),
    index("idx_favorites_user").on(t.userId),
  ],
);

export const searchAnalyticsEventsTable = pgTable(
  "search_analytics_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    query: varchar("query", { length: 500 }),
    category: varchar("category", { length: 128 }),
    region: varchar("region", { length: 128 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    resultCount: integer("result_count").default(0),
    source: varchar("source", { length: 64 }).default("SEARCH"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_search_events_user").on(t.userId),
    index("idx_search_events_created").on(t.createdAt),
    index("idx_search_events_query").on(t.query),
    index("idx_search_events_category").on(t.category),
  ],
);

export const entityViewsTable = pgTable(
  "entity_views",
  {
    id: serial("id").primaryKey(),
    viewerUserId: integer("viewer_user_id").references(() => usersTable.id),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id").notNull(),
    region: varchar("region", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_entity_views_entity").on(t.entityType, t.entityId),
    index("idx_entity_views_created").on(t.createdAt),
  ],
);

export const dashboardMetricCacheTable = pgTable(
  "dashboard_metric_cache",
  {
    id: serial("id").primaryKey(),
    cacheKey: varchar("cache_key", { length: 255 }).notNull(),
    scope: varchar("scope", { length: 64 }).notNull().default("GLOBAL"),
    userId: integer("user_id").references(() => usersTable.id),
    payload: text("payload").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_dashboard_cache_key").on(t.cacheKey),
    index("idx_dashboard_cache_expires").on(t.expiresAt),
  ],
);

/** EPIC 16 — Help / Templates / Chatbot */
export const helpContentTable = pgTable(
  "help_content",
  {
    id: serial("id").primaryKey(),
    page: varchar("page", { length: 128 }).notNull(),
    fieldKey: varchar("field_key", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }),
    helpText: text("help_text"),
    tooltipText: varchar("tooltip_text", { length: 500 }),
    example: text("example"),
    language: varchar("language", { length: 10 }).notNull().default("en"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdBy: integer("created_by").references(() => usersTable.id),
    updatedBy: integer("updated_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_help_content_page_field_lang").on(t.page, t.fieldKey, t.language),
    index("idx_help_content_page").on(t.page),
    index("idx_help_content_field").on(t.fieldKey),
    index("idx_help_content_status").on(t.status),
  ],
);

export const listingTemplatesTable = pgTable(
  "listing_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 128 }),
    category: varchar("category", { length: 128 }).notNull(),
    description: text("description"),
    templateData: text("template_data").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdBy: integer("created_by").references(() => usersTable.id),
    updatedBy: integer("updated_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_listing_templates_industry").on(t.industry),
    index("idx_listing_templates_category").on(t.category),
    index("idx_listing_templates_status").on(t.status),
  ],
);

export const helpArticlesTable = pgTable(
  "help_articles",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    role: varchar("role", { length: 64 }).notNull().default("GENERAL"),
    category: varchar("category", { length: 64 }).notNull(),
    summary: text("summary"),
    content: text("content").notNull(),
    tags: text("tags"),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    publishedAt: timestamp("published_at"),
    viewCount: integer("view_count").notNull().default(0),
    createdBy: integer("created_by").references(() => usersTable.id),
    updatedBy: integer("updated_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_help_article_slug").on(t.slug),
    index("idx_help_articles_role").on(t.role),
    index("idx_help_articles_category").on(t.category),
    index("idx_help_articles_status").on(t.status),
  ],
);

export const helpFaqsTable = pgTable(
  "help_faqs",
  {
    id: serial("id").primaryKey(),
    question: varchar("question", { length: 500 }).notNull(),
    answer: text("answer").notNull(),
    role: varchar("role", { length: 64 }).notNull().default("GENERAL"),
    category: varchar("category", { length: 64 }).notNull().default("Getting Started"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdBy: integer("created_by").references(() => usersTable.id),
    updatedBy: integer("updated_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_help_faqs_role").on(t.role),
    index("idx_help_faqs_category").on(t.category),
    index("idx_help_faqs_status").on(t.status),
  ],
);

export const onboardingProgressTable = pgTable(
  "onboarding_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    role: varchar("role", { length: 64 }).notNull(),
    checklist: text("checklist").notNull().default("{}"),
    currentStep: varchar("current_step", { length: 64 }),
    completionPct: integer("completion_pct").notNull().default(0),
    skipped: boolean("skipped").notNull().default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_onboarding_user_role").on(t.userId, t.role),
    index("idx_onboarding_user").on(t.userId),
  ],
);

export const chatbotSessionsTable = pgTable(
  "chatbot_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    sessionKey: varchar("session_key", { length: 128 }).notNull(),
    roleHint: varchar("role_hint", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_chatbot_session_key").on(t.sessionKey),
    index("idx_chatbot_sessions_user").on(t.userId),
  ],
);

export const chatbotMessagesTable = pgTable(
  "chatbot_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .references(() => chatbotSessionsTable.id)
      .notNull(),
    role: varchar("role", { length: 16 }).notNull(),
    intent: varchar("intent", { length: 64 }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_chatbot_messages_session").on(t.sessionId)],
);

export const helpArticleFeedbackTable = pgTable(
  "help_article_feedback",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .references(() => helpArticlesTable.id)
      .notNull(),
    userId: integer("user_id").references(() => usersTable.id),
    helpful: boolean("helpful").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_help_feedback_article").on(t.articleId)],
);

/** EPIC 17 — Secure file storage metadata */
export const uploadedFilesTable = pgTable(
  "uploaded_files",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id")
      .references(() => usersTable.id)
      .notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: integer("entity_id"),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    size: integer("size").notNull(),
    storageProvider: varchar("storage_provider", { length: 32 }).notNull().default("local"),
    storagePath: text("storage_path").notNull(),
    checksum: varchar("checksum", { length: 128 }),
    isPublic: boolean("is_public").notNull().default(false),
    scanStatus: varchar("scan_status", { length: 32 }).notNull().default("PENDING"),
    scanResult: text("scan_result"),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_uploaded_files_owner").on(t.ownerUserId),
    index("idx_uploaded_files_entity").on(t.entityType, t.entityId),
    index("idx_uploaded_files_provider").on(t.storageProvider),
  ],
);

export const platformRolesTable = pgTable("platform_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformPermissionsTable = pgTable("platform_permissions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformRolePermissionsTable = pgTable("platform_role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id")
    .references(() => platformRolesTable.id)
    .notNull(),
  permissionId: integer("permission_id")
    .references(() => platformPermissionsTable.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** MVP — Manufacturing marketplace */
export const manufacturingFacilitiesTable = pgTable(
  "manufacturing_facilities",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id").references(() => usersTable.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    tagline: varchar("tagline", { length: 500 }),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 32 }),
    website: varchar("website", { length: 255 }),
    certifications: text("certifications"),
    industry: varchar("industry", { length: 128 }),
    ownerName: varchar("owner_name", { length: 255 }),
    sezStatus: varchar("sez_status", { length: 32 }).default("NONE"),
    serviceAreas: text("service_areas"),
    infrastructure: text("infrastructure"),
    workingHours: text("working_hours"),
    images: text("images"),
    addressLine: varchar("address_line", { length: 500 }),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_facility_owner").on(t.ownerUserId),
    index("idx_facility_status").on(t.status),
    index("idx_facility_industry").on(t.industry),
  ],
);

export const machineryInventoryTable = pgTable(
  "machinery_inventory",
  {
    id: serial("id").primaryKey(),
    facilityId: integer("facility_id").references(() => manufacturingFacilitiesTable.id).notNull(),
    ownerUserId: integer("owner_user_id").references(() => usersTable.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    machineType: varchar("machine_type", { length: 128 }).notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    pricePerHour: numeric("price_per_hour", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    pricingModel: varchar("pricing_model", { length: 32 }).notNull().default("HOURLY"),
    pricePerDay: numeric("price_per_day", { precision: 12, scale: 2 }),
    pricePerWeek: numeric("price_per_week", { precision: 12, scale: 2 }),
    pricePerMonth: numeric("price_per_month", { precision: 12, scale: 2 }),
    pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 2 }),
    pricePerBatch: numeric("price_per_batch", { precision: 12, scale: 2 }),
    extraServiceCharges: text("extra_service_charges"),
    subcategory: varchar("subcategory", { length: 128 }),
    condition: varchar("condition", { length: 64 }),
    ageYears: integer("age_years"),
    technicalSpecs: text("technical_specs"),
    serviceCostNotes: text("service_cost_notes"),
    imageUrl: text("image_url"),
    imageFileId: integer("image_file_id"),
    keywords: text("keywords"),
    capacityNotes: varchar("capacity_notes", { length: 255 }),
    certifications: text("certifications"),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_machinery_facility").on(t.facilityId),
    index("idx_machinery_owner").on(t.ownerUserId),
    index("idx_machinery_type").on(t.machineType),
    index("idx_machinery_status").on(t.status),
  ],
);

export const availabilitySlotsTable = pgTable(
  "availability_slots",
  {
    id: serial("id").primaryKey(),
    inventoryId: integer("inventory_id").references(() => machineryInventoryTable.id).notNull(),
    facilityId: integer("facility_id").references(() => manufacturingFacilitiesTable.id).notNull(),
    ownerUserId: integer("owner_user_id").references(() => usersTable.id).notNull(),
    slotDate: date("slot_date").notNull(),
    startTime: varchar("start_time", { length: 8 }).notNull(),
    endTime: varchar("end_time", { length: 8 }).notNull(),
    priceOverride: numeric("price_override", { precision: 12, scale: 2 }),
    status: varchar("status", { length: 32 }).notNull().default("AVAILABLE"),
    reservedUntil: timestamp("reserved_until"),
    requestId: integer("request_id"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrenceRule: varchar("recurrence_rule", { length: 128 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_slots_inventory").on(t.inventoryId),
    index("idx_slots_date").on(t.slotDate),
    index("idx_slots_status").on(t.status),
  ],
);

export const requestMessagesTable = pgTable(
  "request_messages",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),
    senderUserId: integer("sender_user_id").references(() => usersTable.id).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_req_msg_request").on(t.requestId),
    index("idx_req_msg_sender").on(t.senderUserId),
  ],
);

export const requestOffersTable = pgTable(
  "request_offers",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),
    offeredByUserId: integer("offered_by_user_id").references(() => usersTable.id).notNull(),
    offerType: varchar("offer_type", { length: 32 }).notNull().default("COUNTER"),
    proposedPrice: numeric("proposed_price", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    proposedStartDate: timestamp("proposed_start_date"),
    proposedEndDate: timestamp("proposed_end_date"),
    proposedQuantity: integer("proposed_quantity"),
    terms: text("terms"),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    parentOfferId: integer("parent_offer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_request_offers_request").on(t.requestId),
    index("idx_request_offers_status").on(t.status),
  ],
);

/** NFR — auth tokens, jobs, image derivatives */
export const authTokensTable = pgTable(
  "auth_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    email: varchar("email", { length: 255 }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    attempts: integer("attempts").notNull().default(0),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_auth_tokens_hash").on(t.tokenHash),
    index("idx_auth_tokens_user").on(t.userId),
    index("idx_auth_tokens_purpose").on(t.purpose),
  ],
);

export const backgroundJobsTable = pgTable(
  "background_jobs",
  {
    id: serial("id").primaryKey(),
    jobType: varchar("job_type", { length: 64 }).notNull(),
    payload: text("payload").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    lockedAt: timestamp("locked_at"),
    completedAt: timestamp("completed_at"),
    lastError: text("last_error"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_jobs_status_available").on(t.status, t.availableAt)],
);

export const fileDerivativesTable = pgTable(
  "file_derivatives",
  {
    id: serial("id").primaryKey(),
    fileId: integer("file_id").references(() => uploadedFilesTable.id).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    byteSize: integer("byte_size"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_file_derivatives_file").on(t.fileId),
    uniqueIndex("uq_file_derivative_kind").on(t.fileId, t.kind),
  ],
);
