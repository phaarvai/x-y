-- MVP Marketplace Core: facilities, machinery, availability, requests, messaging

-- Profile fields (XFY-006)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_status varchar(32) NOT NULL DEFAULT 'PENDING_PROFILE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed_at timestamp;
CREATE INDEX IF NOT EXISTS idx_users_profile_status ON users(profile_status);

-- Manufacturing facilities (XFY-007)
CREATE TABLE IF NOT EXISTS manufacturing_facilities (
  id serial PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id),
  name varchar(255) NOT NULL,
  tagline varchar(500),
  description text,
  location varchar(255),
  city varchar(100),
  state varchar(100),
  country varchar(100),
  contact_email varchar(255),
  contact_phone varchar(32),
  website varchar(255),
  certifications text,
  industry varchar(128),
  status varchar(32) NOT NULL DEFAULT 'DRAFT',
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facility_owner ON manufacturing_facilities(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_facility_status ON manufacturing_facilities(status);
CREATE INDEX IF NOT EXISTS idx_facility_industry ON manufacturing_facilities(industry);
CREATE INDEX IF NOT EXISTS idx_facility_location ON manufacturing_facilities(city, state, country);

-- Machinery inventory (XFY-012)
CREATE TABLE IF NOT EXISTS machinery_inventory (
  id serial PRIMARY KEY,
  facility_id integer NOT NULL REFERENCES manufacturing_facilities(id),
  owner_user_id integer NOT NULL REFERENCES users(id),
  name varchar(255) NOT NULL,
  machine_type varchar(128) NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  price_per_hour numeric(12,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  service_cost_notes text,
  image_url text,
  image_file_id integer,
  keywords text,
  capacity_notes varchar(255),
  certifications text,
  status varchar(32) NOT NULL DEFAULT 'DRAFT',
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_machinery_facility ON machinery_inventory(facility_id);
CREATE INDEX IF NOT EXISTS idx_machinery_owner ON machinery_inventory(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_machinery_type ON machinery_inventory(machine_type);
CREATE INDEX IF NOT EXISTS idx_machinery_status ON machinery_inventory(status);

-- Availability slots (XFY-022)
CREATE TABLE IF NOT EXISTS availability_slots (
  id serial PRIMARY KEY,
  inventory_id integer NOT NULL REFERENCES machinery_inventory(id),
  facility_id integer NOT NULL REFERENCES manufacturing_facilities(id),
  owner_user_id integer NOT NULL REFERENCES users(id),
  slot_date date NOT NULL,
  start_time varchar(8) NOT NULL,
  end_time varchar(8) NOT NULL,
  price_override numeric(12,2),
  status varchar(32) NOT NULL DEFAULT 'AVAILABLE',
  reserved_until timestamp,
  request_id integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slots_inventory ON availability_slots(inventory_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON availability_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON availability_slots(status);

-- Extend manufacturing_requests for listing workflow (XFY-038)
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS request_type varchar(32) NOT NULL DEFAULT 'REQUIREMENT';
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS facility_id integer REFERENCES manufacturing_facilities(id);
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS inventory_id integer REFERENCES machinery_inventory(id);
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS booking_id integer REFERENCES bookings(id);
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS preferred_start_date timestamp;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS preferred_end_date timestamp;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS decline_reason text;
ALTER TABLE manufacturing_requests ADD COLUMN IF NOT EXISTS material_specs text;
CREATE INDEX IF NOT EXISTS idx_mfg_req_type ON manufacturing_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_mfg_req_facility ON manufacturing_requests(facility_id);
CREATE INDEX IF NOT EXISTS idx_mfg_req_inventory ON manufacturing_requests(inventory_id);

-- Request messaging (XFY-044)
CREATE TABLE IF NOT EXISTS request_messages (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES manufacturing_requests(id),
  sender_user_id integer NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_req_msg_request ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_req_msg_sender ON request_messages(sender_user_id);
