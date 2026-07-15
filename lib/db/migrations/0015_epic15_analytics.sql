-- EPIC 15: Dashboards & Analytics

CREATE TABLE IF NOT EXISTS manufacturing_requests (
  id serial PRIMARY KEY,
  visionary_user_id integer NOT NULL REFERENCES users(id),
  manufacturer_user_id integer REFERENCES users(id),
  title varchar(255) NOT NULL,
  description text,
  status varchar(32) NOT NULL DEFAULT 'DRAFT',
  industry varchar(128),
  category varchar(128),
  city varchar(100),
  state varchar(100),
  country varchar(100),
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  currency varchar(3) DEFAULT 'INR',
  published_at timestamp,
  closed_at timestamp,
  expires_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_req_visionary ON manufacturing_requests(visionary_user_id);
CREATE INDEX IF NOT EXISTS idx_mfg_req_manufacturer ON manufacturing_requests(manufacturer_user_id);
CREATE INDEX IF NOT EXISTS idx_mfg_req_status ON manufacturing_requests(status);
CREATE INDEX IF NOT EXISTS idx_mfg_req_industry ON manufacturing_requests(industry);
CREATE INDEX IF NOT EXISTS idx_mfg_req_created ON manufacturing_requests(created_at);

CREATE TABLE IF NOT EXISTS user_favorites (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  entity_type varchar(64) NOT NULL,
  entity_id integer NOT NULL,
  title varchar(255),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_favorite ON user_favorites(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_entity ON user_favorites(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS search_analytics_events (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  query varchar(500),
  category varchar(128),
  region varchar(128),
  city varchar(100),
  state varchar(100),
  country varchar(100),
  result_count integer DEFAULT 0,
  source varchar(64) DEFAULT 'SEARCH',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_events_user ON search_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_search_events_created ON search_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_search_events_query ON search_analytics_events(query);
CREATE INDEX IF NOT EXISTS idx_search_events_category ON search_analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_search_events_region ON search_analytics_events(region);

CREATE TABLE IF NOT EXISTS entity_views (
  id serial PRIMARY KEY,
  viewer_user_id integer REFERENCES users(id),
  entity_type varchar(64) NOT NULL,
  entity_id integer NOT NULL,
  region varchar(128),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_views_entity ON entity_views(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_views_viewer ON entity_views(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_entity_views_created ON entity_views(created_at);

CREATE TABLE IF NOT EXISTS dashboard_metric_cache (
  id serial PRIMARY KEY,
  cache_key varchar(255) NOT NULL,
  scope varchar(64) NOT NULL DEFAULT 'GLOBAL',
  user_id integer REFERENCES users(id),
  payload text NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_cache_key ON dashboard_metric_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_metric_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_user ON dashboard_metric_cache(user_id);

-- Performance indexes additive to existing tables
CREATE INDEX IF NOT EXISTS idx_bookings_request ON bookings(request_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
