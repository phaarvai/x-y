-- EPIC 14: Admin Console & Operations

ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verification_status varchar(32) NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS industry varchar(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason text;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_industry ON users(industry);

CREATE TABLE IF NOT EXISTS admin_roles (
  id serial PRIMARY KEY,
  name varchar(64) NOT NULL UNIQUE,
  description text,
  permissions text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id serial PRIMARY KEY,
  module varchar(64) NOT NULL,
  action varchar(64) NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_perm_module_action ON admin_permissions(module, action);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id serial PRIMARY KEY,
  admin_role_id integer NOT NULL REFERENCES admin_roles(id),
  permission_id integer NOT NULL REFERENCES admin_permissions(id),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_permission ON admin_role_permissions(admin_role_id, permission_id);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  admin_role_id integer NOT NULL REFERENCES admin_roles(id),
  assigned_by integer REFERENCES users(id),
  assigned_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_admin_role ON user_role_assignments(user_id, admin_role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_user ON user_role_assignments(user_id);

CREATE TABLE IF NOT EXISTS listing_moderations (
  id serial PRIMARY KEY,
  listing_type varchar(64) NOT NULL,
  listing_id integer NOT NULL,
  owner_user_id integer REFERENCES users(id),
  title varchar(255),
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  reviewed_by integer REFERENCES users(id),
  review_reason text,
  internal_notes text,
  reviewed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_moderation ON listing_moderations(listing_type, listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_mod_type ON listing_moderations(listing_type);
CREATE INDEX IF NOT EXISTS idx_listing_mod_status ON listing_moderations(status);
CREATE INDEX IF NOT EXISTS idx_listing_mod_listing ON listing_moderations(listing_type, listing_id);

CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  parent_id integer,
  category_type varchar(64) NOT NULL,
  description text,
  icon varchar(128),
  sort_order integer NOT NULL DEFAULT 0,
  status varchar(32) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_slug_type ON categories(slug, category_type);
CREATE INDEX IF NOT EXISTS idx_category_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_category_type ON categories(category_type);
CREATE INDEX IF NOT EXISTS idx_category_status ON categories(status);

CREATE TABLE IF NOT EXISTS support_cases (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  booking_id integer,
  subject varchar(255) NOT NULL,
  description text NOT NULL,
  priority varchar(16) NOT NULL DEFAULT 'MEDIUM',
  status varchar(32) NOT NULL DEFAULT 'OPEN',
  assigned_admin integer REFERENCES users(id),
  resolution text,
  internal_notes text,
  closed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_cases(status);
CREATE INDEX IF NOT EXISTS idx_support_assigned ON support_cases(assigned_admin);
CREATE INDEX IF NOT EXISTS idx_support_booking ON support_cases(booking_id);

CREATE TABLE IF NOT EXISTS user_login_history (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  ip_address varchar(64),
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON user_login_history(user_id);
