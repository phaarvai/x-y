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
 * EPIC 16 — Help, Templates, Chatbot, Guided UX
 */

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

export type HelpContent = typeof helpContentTable.$inferSelect;

export const listingTemplatesTable = pgTable(
  "listing_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 128 }),
    category: varchar("category", { length: 128 }).notNull(),
    description: text("description"),
    templateData: text("template_data").notNull(), // JSON
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

export type ListingTemplate = typeof listingTemplatesTable.$inferSelect;

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
    tags: text("tags"), // JSON array
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

export type HelpArticle = typeof helpArticlesTable.$inferSelect;

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

export type HelpFaq = typeof helpFaqsTable.$inferSelect;

export const onboardingProgressTable = pgTable(
  "onboarding_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    role: varchar("role", { length: 64 }).notNull(),
    checklist: text("checklist").notNull().default("{}"), // JSON map stepId -> done
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

export type OnboardingProgress = typeof onboardingProgressTable.$inferSelect;

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
    role: varchar("role", { length: 16 }).notNull(), // user | assistant | system
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
