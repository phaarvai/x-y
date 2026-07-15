-- NFR platform foundations: auth tokens, email verification, jobs, slot uniqueness, indexes

-- Auth recovery / OTP / email verification (store hashed tokens only)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  email varchar(255),
  purpose varchar(32) NOT NULL,
  token_hash varchar(128) NOT NULL,
  code_hash varchar(128),
  expires_at timestamp NOT NULL,
  used_at timestamp,
  attempts integer NOT NULL DEFAULT 0,
  metadata text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_purpose ON auth_tokens(purpose);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency varchar(3) DEFAULT 'USD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_country varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_region varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_city varchar(100);

-- Background job queue (async notifications, image processing, analytics)
CREATE TABLE IF NOT EXISTS background_jobs (
  id serial PRIMARY KEY,
  job_type varchar(64) NOT NULL,
  payload text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamp NOT NULL DEFAULT now(),
  locked_at timestamp,
  completed_at timestamp,
  last_error text,
  idempotency_key varchar(128),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_available ON background_jobs(status, available_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_idempotency ON background_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Image derivatives metadata
CREATE TABLE IF NOT EXISTS file_derivatives (
  id serial PRIMARY KEY,
  file_id integer NOT NULL REFERENCES uploaded_files(id),
  kind varchar(32) NOT NULL,
  storage_key text NOT NULL,
  mime_type varchar(128),
  byte_size integer,
  width integer,
  height integer,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_file_derivatives_file ON file_derivatives(file_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_file_derivative_kind ON file_derivatives(file_id, kind);

-- Prevent double-booking race: one ACTIVE slot per machine/date/time
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_inventory_datetime_active
  ON availability_slots(inventory_id, slot_date, start_time, end_time)
  WHERE status IN ('AVAILABLE', 'RESERVED', 'BOOKED');

-- Search / listing performance indexes
CREATE INDEX IF NOT EXISTS idx_machinery_price_hour ON machinery_inventory(price_per_hour);
CREATE INDEX IF NOT EXISTS idx_facilities_city_industry ON manufacturing_facilities(city, industry);
CREATE INDEX IF NOT EXISTS idx_vendor_materials_price ON vendor_materials(unit_price);
CREATE INDEX IF NOT EXISTS idx_labor_skill_city ON labor_listings(skill_category, city);

-- Taxonomy expansion (configurable; categories table remains source of truth)
-- Ensure category_type values used platform-wide:
-- INDUSTRY, MACHINERY, RAW_MATERIAL, SERVICE, CERTIFICATION, LOCATION, CURRENCY
INSERT INTO categories (name, slug, category_type, description, status, sort_order)
SELECT v.name, v.slug, v.category_type, v.description, 'ACTIVE', v.sort_order
FROM (VALUES
  ('CNC Milling', 'cnc-milling', 'MACHINERY', 'CNC milling machines', 10),
  ('3D Printing', '3d-printing', 'MACHINERY', 'Additive manufacturing', 20),
  ('Laser Cutting', 'laser-cutting', 'MACHINERY', 'Laser cutting systems', 30),
  ('Injection Molding', 'injection-molding', 'MACHINERY', 'Injection molding', 40),
  ('CNC Lathe', 'cnc-lathe', 'MACHINERY', 'CNC lathe', 50),
  ('Welding', 'welding', 'MACHINERY', 'Welding equipment', 60),
  ('Assembly', 'assembly', 'MACHINERY', 'Assembly lines', 70),
  ('Aerospace', 'aerospace', 'INDUSTRY', 'Aerospace manufacturing', 10),
  ('Automotive', 'automotive', 'INDUSTRY', 'Automotive', 20),
  ('Electronics', 'electronics', 'INDUSTRY', 'Electronics', 30),
  ('Medical Devices', 'medical-devices', 'INDUSTRY', 'Medical devices', 40),
  ('Consumer Goods', 'consumer-goods', 'INDUSTRY', 'Consumer goods', 50),
  ('ISO 9001', 'iso-9001', 'CERTIFICATION', 'Quality management', 10),
  ('ISO 13485', 'iso-13485', 'CERTIFICATION', 'Medical devices QMS', 20),
  ('USD', 'usd', 'CURRENCY', 'US Dollar', 10),
  ('INR', 'inr', 'CURRENCY', 'Indian Rupee', 20),
  ('EUR', 'eur', 'CURRENCY', 'Euro', 30)
) AS v(name, slug, category_type, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.slug = v.slug AND c.category_type = v.category_type
);
