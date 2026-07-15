-- Repeatable: ensure category seed rows exist (idempotent)
INSERT INTO categories (name, slug, category_type, description, sort_order, status)
VALUES
  ('Industries', 'industries', 'INDUSTRY', 'Industries category', 0, 'ACTIVE'),
  ('Machinery', 'machinery', 'MACHINERY', 'Machinery category', 1, 'ACTIVE'),
  ('Services', 'services', 'SERVICE', 'Services category', 2, 'ACTIVE'),
  ('Raw Materials', 'raw-materials', 'RAW_MATERIAL', 'Raw Materials category', 3, 'ACTIVE')
ON CONFLICT (slug, category_type) DO NOTHING;
