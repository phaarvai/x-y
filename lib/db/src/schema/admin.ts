import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * EPIC 14 — Admin Console & Operations
 */

export const adminRolesTable = pgTable(
  "admin_roles",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 64 }).notNull().unique(),
    description: text("description"),
    permissions: text("permissions"), // JSON array of "module:action" — denormalized cache
    isSystem: boolean("is_system").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_admin_roles_name").on(t.name)],
);

export type AdminRole = typeof adminRolesTable.$inferSelect;

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

export type AdminPermission = typeof adminPermissionsTable.$inferSelect;

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

export type UserRoleAssignment = typeof userRoleAssignmentsTable.$inferSelect;

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
    index("idx_listing_mod_listing").on(t.listingType, t.listingId),
    uniqueIndex("uq_listing_moderation").on(t.listingType, t.listingId),
  ],
);

export type ListingModeration = typeof listingModerationsTable.$inferSelect;

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

export type Category = typeof categoriesTable.$inferSelect;

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

export type SupportCase = typeof supportCasesTable.$inferSelect;

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

export type UserLoginHistory = typeof userLoginHistoryTable.$inferSelect;
