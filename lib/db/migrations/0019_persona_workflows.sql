-- Persona workflows: factory enrichments, multi-pricing, counter-offers, requirement confidential

-- Factory profile enrichments (MF-001)
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS owner_name varchar(255);
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS sez_status varchar(32) DEFAULT 'NONE';
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS service_areas text;
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS infrastructure text;
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS working_hours text;
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS images text;
ALTER TABLE manufacturing_facilities ADD COLUMN IF NOT EXISTS address_line varchar(500);

-- Multi-pricing on machinery (MF-003)
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS pricing_model varchar(32) NOT NULL DEFAULT 'HOURLY';
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS price_per_day numeric(12,2);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS price_per_week numeric(12,2);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS price_per_month numeric(12,2);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS price_per_unit numeric(12,2);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS price_per_batch numeric(12,2);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS extra_service_charges text;
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS subcategory varchar(128);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS condition varchar(64);
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS age_years integer;
ALTER TABLE machinery_inventory ADD COLUMN IF NOT EXISTS technical_specs text;

-- Availability enhancements (MF-004)
ALTER TABLE availability_slots ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE availability_slots ADD COLUMN IF NOT EXISTS recurrence_rule varchar(128);
ALTER TABLE availability_slots ADD COLUMN IF NOT EXISTS notes text;

-- Counter offers (MF-006)
CREATE TABLE IF NOT EXISTS request_offers (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES manufacturing_requests(id),
  offered_by_user_id integer NOT NULL REFERENCES users(id),
  offer_type varchar(32) NOT NULL DEFAULT 'COUNTER',
  proposed_price numeric(14,2),
  currency varchar(3) DEFAULT 'USD',
  proposed_start_date timestamp,
  proposed_end_date timestamp,
  proposed_quantity integer,
  terms text,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  parent_offer_id integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_offers_request ON request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_offers_status ON request_offers(status);

-- Visionary requirement enrichments (VI-001)
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS is_confidential boolean NOT NULL DEFAULT false;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS required_machinery text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS required_labor text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS required_materials text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS required_logistics text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS required_legal text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS timeline_notes text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS attachment_file_ids text;

-- Notification read timestamp
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamp;
