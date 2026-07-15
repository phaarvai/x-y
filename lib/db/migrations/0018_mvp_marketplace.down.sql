-- Rollback 0018_mvp_marketplace.sql

DROP TABLE IF EXISTS request_messages;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS material_specs;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS decline_reason;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS message;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS preferred_end_date;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS preferred_start_date;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS quantity;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS booking_id;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS inventory_id;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS facility_id;
ALTER TABLE manufacturing_requests DROP COLUMN IF EXISTS request_type;
DROP TABLE IF EXISTS availability_slots;
DROP TABLE IF EXISTS machinery_inventory;
DROP TABLE IF EXISTS manufacturing_facilities;
ALTER TABLE users DROP COLUMN IF EXISTS profile_completed_at;
ALTER TABLE users DROP COLUMN IF EXISTS profile_status;
ALTER TABLE users DROP COLUMN IF EXISTS bio;
ALTER TABLE users DROP COLUMN IF EXISTS organization;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
DELETE FROM schema_migrations WHERE version = '0018';
