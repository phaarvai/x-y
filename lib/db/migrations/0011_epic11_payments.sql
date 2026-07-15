-- EPIC 11: Payments, Subscriptions, Commissions, Advertisements
-- Safe additive migration (no drops of existing objects)

ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_role varchar(64);

CREATE TABLE IF NOT EXISTS transactions (
  id serial PRIMARY KEY,
  request_id integer,
  booking_id integer REFERENCES bookings(id),
  payer_user_id integer NOT NULL REFERENCES users(id),
  payee_user_id integer REFERENCES users(id),
  amount numeric(14,2) NOT NULL,
  platform_fee numeric(14,2) DEFAULT 0,
  commission_amount numeric(14,2) DEFAULT 0,
  commission_type varchar(32) DEFAULT 'PERCENTAGE',
  commission_rate numeric(8,4) DEFAULT 0,
  tax_amount numeric(14,2) DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'INR',
  payment_method varchar(64),
  payment_provider varchar(64),
  payment_provider_reference varchar(255),
  reference_number varchar(128),
  transaction_date timestamp NOT NULL DEFAULT now(),
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  notes text,
  admin_notes text,
  updated_by_admin integer REFERENCES users(id),
  receipt_url text,
  invoice_url text,
  checkout_session_id varchar(255),
  webhook_processed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txn_booking ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_txn_request ON transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_txn_payer ON transactions(payer_user_id);
CREATE INDEX IF NOT EXISTS idx_txn_payee ON transactions(payee_user_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(transaction_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_provider_ref ON transactions(payment_provider_reference) WHERE payment_provider_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_reference_number ON transactions(reference_number) WHERE reference_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS transaction_status_history (
  id serial PRIMARY KEY,
  transaction_id integer NOT NULL REFERENCES transactions(id),
  from_status varchar(32),
  to_status varchar(32) NOT NULL,
  changed_by integer REFERENCES users(id),
  notes text,
  source varchar(32) NOT NULL DEFAULT 'SYSTEM',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_txn_history_txn ON transaction_status_history(transaction_id);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id serial PRIMARY KEY,
  provider varchar(64) NOT NULL,
  event_id varchar(255) NOT NULL,
  event_type varchar(128),
  payload_hash varchar(128),
  transaction_id integer REFERENCES transactions(id),
  processed_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_provider_event ON payment_webhook_events(provider, event_id);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id serial PRIMARY KEY,
  name varchar(128) NOT NULL,
  description text,
  price numeric(12,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'INR',
  billing_cycle varchar(32) NOT NULL DEFAULT 'MONTHLY',
  commission_type varchar(32) NOT NULL DEFAULT 'PERCENTAGE',
  commission_value numeric(10,4) NOT NULL DEFAULT 10,
  listing_limit integer DEFAULT 10,
  featured_listings integer DEFAULT 0,
  priority_support boolean NOT NULL DEFAULT false,
  ad_credits integer NOT NULL DEFAULT 0,
  storage_limit integer DEFAULT 1024,
  features text,
  status varchar(32) NOT NULL DEFAULT 'ACTIVE',
  is_recommended boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_plan_status ON subscription_plans(status);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  plan_id integer NOT NULL REFERENCES subscription_plans(id),
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  start_date timestamp NOT NULL DEFAULT now(),
  end_date timestamp,
  renewal_date timestamp,
  auto_renew boolean NOT NULL DEFAULT true,
  payment_transaction_id integer REFERENCES transactions(id),
  cancelled_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sub_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sub_plan ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_sub_status ON user_subscriptions(status);

CREATE TABLE IF NOT EXISTS advertisements (
  id serial PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id),
  title varchar(255) NOT NULL,
  description text,
  image_url text,
  destination_url text NOT NULL,
  placement varchar(64) NOT NULL,
  category varchar(64),
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  budget numeric(12,2) DEFAULT 0,
  remaining_credits integer NOT NULL DEFAULT 0,
  rejection_reason text,
  approved_by integer REFERENCES users(id),
  approved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_owner ON advertisements(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ad_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_ad_placement ON advertisements(placement);

CREATE TABLE IF NOT EXISTS advertisement_analytics (
  id serial PRIMARY KEY,
  advertisement_id integer NOT NULL REFERENCES advertisements(id),
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  ctr numeric(8,4) DEFAULT 0,
  last_viewed_at timestamp,
  last_clicked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_analytics_ad ON advertisement_analytics(advertisement_id);

CREATE TABLE IF NOT EXISTS advertisement_events (
  id serial PRIMARY KEY,
  advertisement_id integer NOT NULL REFERENCES advertisements(id),
  event_type varchar(16) NOT NULL,
  visitor_hash varchar(128) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_event_ad ON advertisement_events(advertisement_id);

CREATE TABLE IF NOT EXISTS commission_settings (
  id serial PRIMARY KEY,
  default_commission_type varchar(32) NOT NULL DEFAULT 'PERCENTAGE',
  default_commission_value numeric(10,4) NOT NULL DEFAULT 10,
  tax_rate numeric(8,4) NOT NULL DEFAULT 18,
  updated_by integer REFERENCES users(id),
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO commission_settings (default_commission_type, default_commission_value, tax_rate)
SELECT 'PERCENTAGE', 10, 18
WHERE NOT EXISTS (SELECT 1 FROM commission_settings LIMIT 1);
