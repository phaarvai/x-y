import {
  pgTable,
  serial,
  integer,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * EPIC 17 — Secure file storage metadata (XFY-086)
 */
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
    size: bigint("size", { mode: "number" }).notNull(),
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
    index("idx_uploaded_files_uploaded").on(t.uploadedAt),
  ],
);

export type UploadedFile = typeof uploadedFilesTable.$inferSelect;

export const platformRolesTable = pgTable("platform_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlatformRole = typeof platformRolesTable.$inferSelect;

export const platformPermissionsTable = pgTable("platform_permissions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlatformPermission = typeof platformPermissionsTable.$inferSelect;

export const platformRolePermissionsTable = pgTable(
  "platform_role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .references(() => platformRolesTable.id)
      .notNull(),
    permissionId: integer("permission_id")
      .references(() => platformPermissionsTable.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);
