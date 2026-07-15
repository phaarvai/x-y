-- Rollback for 0017_epic17_infrastructure.sql
-- WARNING: Drops EPIC 17 tables and columns. Does not remove schema_migrations rows for prior migrations.

DROP TABLE IF EXISTS platform_role_permissions;
DROP TABLE IF EXISTS platform_permissions;
DROP TABLE IF EXISTS platform_roles;
DROP TABLE IF EXISTS uploaded_files;

ALTER TABLE audit_logs DROP COLUMN IF EXISTS old_value;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS new_value;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_agent;
DROP INDEX IF EXISTS idx_audit_created;

-- Keep schema_migrations and lock tables (used by migrator); remove only this version row:
DELETE FROM schema_migrations WHERE version = '0017';
