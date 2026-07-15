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
 * EPIC 11 — Payments, Subscriptions, Commission, Advertisements
 */

/** Booking / request payment ledger (XFY-052, XFY-053) */
export const transactionsTable = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id"),
    bookingId: integer("booking_id").references(() => bookingsTable.id),
    payerUserId: integer("payer_user_id")
      .references(() => usersTable.id)
      .notNull(),
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
  },
  (t) => [
    index("idx_txn_booking").on(t.bookingId),
    index("idx_txn_request").on(t.requestId),
    index("idx_txn_payer").on(t.payerUserId),
    index("idx_txn_payee").on(t.payeeUserId),
    index("idx_txn_status").on(t.status),
    index("idx_txn_date").on(t.transactionDate),
    uniqueIndex("uq_txn_provider_ref").on(t.paymentProviderReference),
    uniqueIndex("uq_txn_reference_number").on(t.referenceNumber),
  ],
);

export type Transaction = typeof transactionsTable.$inferSelect;

/** Immutable status history for manual/gateway updates */
export const transactionStatusHistoryTable = pgTable(
  "transaction_status_history",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transaction_id")
      .references(() => transactionsTable.id)
      .notNull(),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    changedBy: integer("changed_by").references(() => usersTable.id),
    notes: text("notes"),
    source: varchar("source", { length: 32 }).notNull().default("SYSTEM"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_txn_history_txn").on(t.transactionId)],
);

export type TransactionStatusHistory = typeof transactionStatusHistoryTable.$inferSelect;

/** Webhook idempotency / replay protection */
export const paymentWebhookEventsTable = pgTable(
  "payment_webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 64 }).notNull(),
    eventId: varchar("event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 128 }),
    payloadHash: varchar("payload_hash", { length: 128 }),
    transactionId: integer("transaction_id").references(() => transactionsTable.id),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_webhook_provider_event").on(t.provider, t.eventId)],
);

export type PaymentWebhookEvent = typeof paymentWebhookEventsTable.$inferSelect;

/** Subscription plans (XFY-055) */
export const subscriptionPlansTable = pgTable(
  "subscription_plans",
  {
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
  },
  (t) => [
    index("idx_sub_plan_status").on(t.status),
    index("idx_sub_plan_cycle").on(t.billingCycle),
  ],
);

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;

/** User subscriptions */
export const userSubscriptionsTable = pgTable(
  "user_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    planId: integer("plan_id")
      .references(() => subscriptionPlansTable.id)
      .notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    startDate: timestamp("start_date").defaultNow().notNull(),
    endDate: timestamp("end_date"),
    renewalDate: timestamp("renewal_date"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    paymentTransactionId: integer("payment_transaction_id").references(() => transactionsTable.id),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_user_sub_user").on(t.userId),
    index("idx_user_sub_plan").on(t.planId),
    index("idx_user_sub_status").on(t.status),
  ],
);

export type UserSubscription = typeof userSubscriptionsTable.$inferSelect;

/** Advertisements (XFY-058) */
export const advertisementsTable = pgTable(
  "advertisements",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id")
      .references(() => usersTable.id)
      .notNull(),
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
  },
  (t) => [
    index("idx_ad_owner").on(t.ownerUserId),
    index("idx_ad_status").on(t.status),
    index("idx_ad_placement").on(t.placement),
    index("idx_ad_dates").on(t.startDate, t.endDate),
  ],
);

export type Advertisement = typeof advertisementsTable.$inferSelect;

export const advertisementAnalyticsTable = pgTable(
  "advertisement_analytics",
  {
    id: serial("id").primaryKey(),
    advertisementId: integer("advertisement_id")
      .references(() => advertisementsTable.id)
      .notNull(),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    ctr: numeric("ctr", { precision: 8, scale: 4 }).default("0"),
    lastViewedAt: timestamp("last_viewed_at"),
    lastClickedAt: timestamp("last_clicked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_ad_analytics_ad").on(t.advertisementId)],
);

export type AdvertisementAnalytics = typeof advertisementAnalyticsTable.$inferSelect;

/** Dedup click/impression fraud prevention */
export const advertisementEventsTable = pgTable(
  "advertisement_events",
  {
    id: serial("id").primaryKey(),
    advertisementId: integer("advertisement_id")
      .references(() => advertisementsTable.id)
      .notNull(),
    eventType: varchar("event_type", { length: 16 }).notNull(),
    visitorHash: varchar("visitor_hash", { length: 128 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_ad_event_ad").on(t.advertisementId),
    index("idx_ad_event_visitor").on(t.visitorHash, t.eventType, t.advertisementId),
  ],
);

export type AdvertisementEvent = typeof advertisementEventsTable.$inferSelect;

/** Platform commission defaults */
export const commissionSettingsTable = pgTable("commission_settings", {
  id: serial("id").primaryKey(),
  defaultCommissionType: varchar("default_commission_type", { length: 32 }).notNull().default("PERCENTAGE"),
  defaultCommissionValue: numeric("default_commission_value", { precision: 10, scale: 4 })
    .notNull()
    .default("10"),
  taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).notNull().default("18"),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommissionSettings = typeof commissionSettingsTable.$inferSelect;
