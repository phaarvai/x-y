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
