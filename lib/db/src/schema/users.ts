import { pgTable, text, serial, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  preferredLanguage: varchar("preferred_language", { length: 10 }).notNull().default("en"),
  /** Platform RBAC role — nullable for backward compatibility with existing accounts */
  primaryRole: varchar("primary_role", { length: 64 }),
  /** Account status: ACTIVE | SUSPENDED | DEACTIVATED */
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

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
