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

/**
 * Minimal booking stub for EPIC 10 legal docs & disputes.
 * Compatible with EPIC 8 lifecycle statuses; non-breaking additive table.
 */
export const bookingsTable = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    visionaryUserId: integer("visionary_user_id")
      .references(() => usersTable.id)
      .notNull(),
    manufacturerUserId: integer("manufacturer_user_id")
      .references(() => usersTable.id)
      .notNull(),
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
  },
  (t) => [
    index("idx_bookings_visionary").on(t.visionaryUserId),
    index("idx_bookings_manufacturer").on(t.manufacturerUserId),
    index("idx_bookings_status").on(t.status),
  ],
);

export type Booking = typeof bookingsTable.$inferSelect;

/** Legal service provider profiles (XFY-048) */
export const legalServiceProvidersTable = pgTable(
  "legal_service_providers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
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
    identityVerificationStatus: varchar("identity_verification_status", { length: 32 })
      .notNull()
      .default("UNVERIFIED"),
    isPublished: boolean("is_published").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_legal_provider_user").on(t.userId),
    index("idx_legal_provider_type").on(t.providerType),
    index("idx_legal_provider_published").on(t.isPublished),
    index("idx_legal_provider_city").on(t.city),
  ],
);

export type LegalServiceProvider = typeof legalServiceProvidersTable.$inferSelect;

/** Admin-managed contract templates (XFY-049) */
export const contractTemplatesTable = pgTable(
  "contract_templates",
  {
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
  },
  (t) => [
    index("idx_contract_template_category").on(t.category),
    index("idx_contract_template_status").on(t.status),
    index("idx_contract_template_active").on(t.isActive),
  ],
);

export type ContractTemplate = typeof contractTemplatesTable.$inferSelect;

/** Immutable template versions */
export const contractTemplateVersionsTable = pgTable(
  "contract_template_versions",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id")
      .references(() => contractTemplatesTable.id)
      .notNull(),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    changeLog: text("change_log"),
    createdBy: integer("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_template_version_template").on(t.templateId),
    uniqueIndex("uq_template_version").on(t.templateId, t.version),
  ],
);

export type ContractTemplateVersion = typeof contractTemplateVersionsTable.$inferSelect;

/** Legal documents attached to bookings (XFY-050) */
export const bookingLegalDocumentsTable = pgTable(
  "booking_legal_documents",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .references(() => bookingsTable.id)
      .notNull(),
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
  },
  (t) => [
    index("idx_booking_legal_booking").on(t.bookingId),
    index("idx_booking_legal_template").on(t.templateId),
    index("idx_booking_legal_status").on(t.status),
  ],
);

export type BookingLegalDocument = typeof bookingLegalDocumentsTable.$inferSelect;

/** Immutable agreement acceptances */
export const agreementAcceptancesTable = pgTable(
  "agreement_acceptances",
  {
    id: serial("id").primaryKey(),
    bookingLegalDocumentId: integer("booking_legal_document_id")
      .references(() => bookingLegalDocumentsTable.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    accepted: boolean("accepted").notNull().default(true),
    acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
    acceptedIp: varchar("accepted_ip", { length: 64 }),
    acceptedUserAgent: text("accepted_user_agent"),
    digitalSignature: text("digital_signature"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_acceptance_doc_user").on(t.bookingLegalDocumentId, t.userId),
    index("idx_acceptance_user").on(t.userId),
  ],
);

export type AgreementAcceptance = typeof agreementAcceptancesTable.$inferSelect;

/** Disputes (XFY-051) */
export const disputesTable = pgTable(
  "disputes",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .references(() => bookingsTable.id)
      .notNull(),
    openedBy: integer("opened_by")
      .references(() => usersTable.id)
      .notNull(),
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
  },
  (t) => [
    index("idx_disputes_booking").on(t.bookingId),
    index("idx_disputes_status").on(t.status),
    index("idx_disputes_opened_by").on(t.openedBy),
    index("idx_disputes_priority").on(t.priority),
  ],
);

export type Dispute = typeof disputesTable.$inferSelect;

export const disputeEvidenceTable = pgTable(
  "dispute_evidence",
  {
    id: serial("id").primaryKey(),
    disputeId: integer("dispute_id")
      .references(() => disputesTable.id)
      .notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileType: varchar("file_type", { length: 128 }).notNull(),
    uploadedBy: integer("uploaded_by")
      .references(() => usersTable.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_dispute_evidence_dispute").on(t.disputeId)],
);

export type DisputeEvidence = typeof disputeEvidenceTable.$inferSelect;

/** Audit log for legal & dispute actions */
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").references(() => usersTable.id),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id"),
    metadata: text("metadata"),
    /** EPIC 17 — optional structured change tracking */
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

export type AuditLog = typeof auditLogsTable.$inferSelect;

/** Lightweight in-app notifications (EPIC 9 compatible stub) */
export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    category: varchar("category", { length: 32 }).notNull().default("LEGAL"),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    relatedType: varchar("related_type", { length: 64 }),
    relatedId: integer("related_id"),
    status: varchar("status", { length: 16 }).notNull().default("UNREAD"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_notifications_user").on(t.userId),
    index("idx_notifications_status").on(t.userId, t.status),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
