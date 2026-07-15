-- EPIC 10 Legal stub tables (additive) — run before or with epic 11 if missing
CREATE TABLE IF NOT EXISTS bookings (
  id serial PRIMARY KEY,
  reference varchar(64) NOT NULL UNIQUE,
  visionary_user_id integer NOT NULL REFERENCES users(id),
  manufacturer_user_id integer NOT NULL REFERENCES users(id),
  facility_id integer,
  inventory_id integer,
  request_id integer,
  status varchar(32) NOT NULL DEFAULT 'CONFIRMED',
  agreed_price numeric(12,2),
  currency varchar(3) DEFAULT 'INR',
  start_date timestamp,
  end_date timestamp,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  actor_user_id integer REFERENCES users(id),
  action varchar(64) NOT NULL,
  entity_type varchar(64) NOT NULL,
  entity_id integer,
  metadata text,
  ip_address varchar(64),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  category varchar(32) NOT NULL DEFAULT 'LEGAL',
  event_type varchar(64) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  related_type varchar(64),
  related_id integer,
  status varchar(16) NOT NULL DEFAULT 'UNREAD',
  created_at timestamp NOT NULL DEFAULT now()
);
