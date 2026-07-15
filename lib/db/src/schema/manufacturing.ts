import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** MVP — Manufacturing facility profile (XFY-007) */
export const manufacturingFacilitiesTable = pgTable(
  "manufacturing_facilities",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id")
      .references(() => usersTable.id)
      .notNull(),
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
    index("idx_facility_location").on(t.city, t.state, t.country),
  ],
);

export type ManufacturingFacility = typeof manufacturingFacilitiesTable.$inferSelect;

export const machineryInventoryTable = pgTable(
  "machinery_inventory",
  {
    id: serial("id").primaryKey(),
    facilityId: integer("facility_id")
      .references(() => manufacturingFacilitiesTable.id)
      .notNull(),
    ownerUserId: integer("owner_user_id")
      .references(() => usersTable.id)
      .notNull(),
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

export type MachineryInventory = typeof machineryInventoryTable.$inferSelect;

export const availabilitySlotsTable = pgTable(
  "availability_slots",
  {
    id: serial("id").primaryKey(),
    inventoryId: integer("inventory_id")
      .references(() => machineryInventoryTable.id)
      .notNull(),
    facilityId: integer("facility_id")
      .references(() => manufacturingFacilitiesTable.id)
      .notNull(),
    ownerUserId: integer("owner_user_id")
      .references(() => usersTable.id)
      .notNull(),
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

export type AvailabilitySlot = typeof availabilitySlotsTable.$inferSelect;

export const requestOffersTable = pgTable(
  "request_offers",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),
    offeredByUserId: integer("offered_by_user_id")
      .references(() => usersTable.id)
      .notNull(),
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

export type RequestOffer = typeof requestOffersTable.$inferSelect;
