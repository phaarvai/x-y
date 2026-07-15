-- EPIC 17: Data Architecture, File Storage, Audit enhancements, Migration tracking
-- Additive / backward-compatible

CREATE TABLE IF NOT EXISTS schema_migrations (
  id serial PRIMARY KEY,
  version varchar(128) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  applied_at timestamp NOT NULL DEFAULT now(),
  checksum varchar(64),
  execution_ms integer
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

CREATE TABLE IF NOT EXISTS schema_migrations_lock (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamp,
  locked_by varchar(255)
);

INSERT INTO schema_migrations_lock (id, locked)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Enhance audit_logs (XFY-088) — keep actor_user_id; add optional columns
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent text;
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Uploaded files (XFY-086)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id serial PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id),
  entity_type varchar(64),
  entity_id integer,
  file_name varchar(255) NOT NULL,
  original_name varchar(255) NOT NULL,
  mime_type varchar(128) NOT NULL,
  size bigint NOT NULL,
  storage_provider varchar(32) NOT NULL DEFAULT 'local',
  storage_path text NOT NULL,
  checksum varchar(128),
  is_public boolean NOT NULL DEFAULT false,
  scan_status varchar(32) NOT NULL DEFAULT 'PENDING',
  scan_result text,
  uploaded_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_owner ON uploaded_files(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_entity ON uploaded_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_provider ON uploaded_files(storage_provider);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded ON uploaded_files(uploaded_at);

-- Platform marketplace roles registry (XFY-087) — reference table for seeds/docs
CREATE TABLE IF NOT EXISTS platform_roles (
  id serial PRIMARY KEY,
  name varchar(64) NOT NULL UNIQUE,
  display_name varchar(128) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_permissions (
  id serial PRIMARY KEY,
  code varchar(64) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_role_permissions (
  id serial PRIMARY KEY,
  role_id integer NOT NULL REFERENCES platform_roles(id),
  permission_id integer NOT NULL REFERENCES platform_permissions(id),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_role_perm ON platform_role_permissions(role_id, permission_id);

-- Down migration notes (rollback): see 0017_epic17_infrastructure.down.sql
