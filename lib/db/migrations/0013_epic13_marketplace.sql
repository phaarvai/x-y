-- EPIC 13: Service provider marketplace (vendors, labor, logistics, investors, market leads)

CREATE TABLE IF NOT EXISTS service_provider_profiles (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  provider_type varchar(64) NOT NULL,
  company_name varchar(255) NOT NULL,
  display_name varchar(255) NOT NULL,
  service_categories text,
  description text,
  business_type varchar(128),
  experience_years integer DEFAULT 0,
  certifications text,
  licenses text,
  location varchar(255),
  city varchar(100),
  state varchar(100),
  country varchar(100),
  serviceable_areas text,
  pricing_model varchar(64),
  contact_email varchar(255),
  contact_phone varchar(32),
  website varchar(255),
  social_links text,
  verification_status varchar(32) NOT NULL DEFAULT 'UNVERIFIED',
  rating numeric(3,2) DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  profile_image text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_provider_user_type ON service_provider_profiles(user_id, provider_type);
CREATE INDEX IF NOT EXISTS idx_sp_provider_type ON service_provider_profiles(provider_type);
CREATE INDEX IF NOT EXISTS idx_sp_city ON service_provider_profiles(city);
CREATE INDEX IF NOT EXISTS idx_sp_country ON service_provider_profiles(country);
CREATE INDEX IF NOT EXISTS idx_sp_verification ON service_provider_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_sp_published ON service_provider_profiles(is_published);

CREATE TABLE IF NOT EXISTS vendor_materials (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  material_name varchar(255) NOT NULL,
  category varchar(128) NOT NULL,
  sub_category varchar(128),
  description text,
  unit varchar(32) NOT NULL DEFAULT 'KG',
  minimum_order_quantity numeric(14,2),
  available_quantity numeric(14,2),
  unit_price numeric(14,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'INR',
  lead_time varchar(64),
  availability_status varchar(32) NOT NULL DEFAULT 'AVAILABLE',
  location varchar(255),
  delivery_options text,
  images text,
  specifications text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_material_provider ON vendor_materials(provider_id);
CREATE INDEX IF NOT EXISTS idx_vendor_material_category ON vendor_materials(category);

CREATE TABLE IF NOT EXISTS vendor_inquiries (
  id serial PRIMARY KEY,
  material_id integer REFERENCES vendor_materials(id),
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  inquirer_user_id integer NOT NULL REFERENCES users(id),
  message text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'OPEN',
  conversation_id integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labor_listings (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  worker_type varchar(64) NOT NULL,
  skill_category varchar(128) NOT NULL,
  experience_level varchar(64),
  worker_count integer NOT NULL DEFAULT 1,
  availability varchar(64) NOT NULL DEFAULT 'AVAILABLE',
  availability_calendar text,
  city varchar(100),
  state varchar(100),
  country varchar(100),
  daily_rate numeric(12,2),
  monthly_rate numeric(12,2),
  currency varchar(3) NOT NULL DEFAULT 'INR',
  description text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_labor_provider ON labor_listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_labor_skill ON labor_listings(skill_category);
CREATE INDEX IF NOT EXISTS idx_labor_city ON labor_listings(city);

CREATE TABLE IF NOT EXISTS labor_inquiries (
  id serial PRIMARY KEY,
  listing_id integer REFERENCES labor_listings(id),
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  inquirer_user_id integer NOT NULL REFERENCES users(id),
  message text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'OPEN',
  response_message text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_services (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  service_type varchar(64) NOT NULL,
  vehicle_type varchar(64),
  storage_type varchar(64),
  capacity varchar(128),
  coverage_areas text,
  pricing_model varchar(64),
  minimum_charge numeric(12,2),
  currency varchar(3) NOT NULL DEFAULT 'INR',
  estimated_delivery varchar(128),
  insurance_available boolean NOT NULL DEFAULT false,
  tracking_available boolean NOT NULL DEFAULT false,
  description text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logistics_provider ON logistics_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_service_type ON logistics_services(service_type);

CREATE TABLE IF NOT EXISTS logistics_quotes (
  id serial PRIMARY KEY,
  service_id integer REFERENCES logistics_services(id),
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  request_id integer,
  requester_user_id integer NOT NULL REFERENCES users(id),
  pickup_location varchar(255),
  drop_location varchar(255),
  cargo_details text,
  requested_date timestamp,
  status varchar(32) NOT NULL DEFAULT 'REQUESTED',
  quoted_amount numeric(12,2),
  currency varchar(3) DEFAULT 'INR',
  provider_response text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logistics_quote_provider ON logistics_quotes(provider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_quote_request ON logistics_quotes(request_id);

CREATE TABLE IF NOT EXISTS investor_profiles (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL UNIQUE REFERENCES service_provider_profiles(id),
  investment_interests text,
  preferred_industries text,
  ticket_size_minimum numeric(14,2),
  ticket_size_maximum numeric(14,2),
  preferred_geographies text,
  investment_stages text,
  portfolio_website varchar(255),
  bio text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_investments (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  owner_user_id integer NOT NULL REFERENCES users(id),
  title varchar(255),
  is_open_for_investment boolean NOT NULL DEFAULT true,
  minimum_investment numeric(14,2),
  maximum_investment numeric(14,2),
  equity_offered numeric(8,4),
  funding_goal numeric(14,2),
  confidential_notes text,
  public_summary text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_investment_project ON project_investments(project_id);

CREATE TABLE IF NOT EXISTS investor_introductions (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  project_investment_id integer REFERENCES project_investments(id),
  investor_id integer NOT NULL REFERENCES users(id),
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  notes text,
  owner_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_investor_intro ON investor_introductions(project_id, investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_intro_project ON investor_introductions(project_id);

CREATE TABLE IF NOT EXISTS market_opportunities (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES service_provider_profiles(id),
  title varchar(255) NOT NULL,
  product_category varchar(128) NOT NULL,
  description text,
  demand_volume numeric(14,2),
  unit varchar(32),
  geography varchar(255),
  timeline varchar(128),
  target_price numeric(14,2),
  currency varchar(3) DEFAULT 'INR',
  contact_rules text,
  status varchar(32) NOT NULL DEFAULT 'DRAFT',
  moderation_status varchar(32) NOT NULL DEFAULT 'PENDING',
  moderated_by integer REFERENCES users(id),
  moderated_at timestamp,
  moderation_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_opp_provider ON market_opportunities(provider_id);
CREATE INDEX IF NOT EXISTS idx_market_opp_status ON market_opportunities(status);

CREATE TABLE IF NOT EXISTS market_interest_requests (
  id serial PRIMARY KEY,
  opportunity_id integer NOT NULL REFERENCES market_opportunities(id),
  user_id integer NOT NULL REFERENCES users(id),
  message text,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_market_interest_user ON market_interest_requests(opportunity_id, user_id);
