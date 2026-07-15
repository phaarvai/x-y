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
 * EPIC 15 — Dashboards & Analytics
 * Lightweight stubs for request metrics + analytics event capture.
 */

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

export type ManufacturingRequest = typeof manufacturingRequestsTable.$inferSelect;

export const requestMessagesTable = pgTable(
  "request_messages",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),
    senderUserId: integer("sender_user_id")
      .references(() => usersTable.id)
      .notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_req_msg_request").on(t.requestId),
    index("idx_req_msg_sender").on(t.senderUserId),
  ],
);

export type RequestMessage = typeof requestMessagesTable.$inferSelect;

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
    index("idx_favorites_entity").on(t.entityType, t.entityId),
  ],
);

export type UserFavorite = typeof userFavoritesTable.$inferSelect;

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
    index("idx_search_events_region").on(t.region),
  ],
);

export type SearchAnalyticsEvent = typeof searchAnalyticsEventsTable.$inferSelect;

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
    index("idx_entity_views_viewer").on(t.viewerUserId),
    index("idx_entity_views_created").on(t.createdAt),
  ],
);

export type EntityView = typeof entityViewsTable.$inferSelect;

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
    index("idx_dashboard_cache_user").on(t.userId),
  ],
);

export type DashboardMetricCache = typeof dashboardMetricCacheTable.$inferSelect;

export const DATE_RANGE_PRESETS = [
  "TODAY",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
  "THIS_MONTH",
  "LAST_MONTH",
  "THIS_YEAR",
  "CUSTOM",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];
