-- EPIC 16: Help, Templates, Chatbot, Guided UX

CREATE TABLE IF NOT EXISTS help_content (
  id serial PRIMARY KEY,
  page varchar(128) NOT NULL,
  field_key varchar(128) NOT NULL,
  title varchar(255),
  help_text text,
  tooltip_text varchar(500),
  example text,
  language varchar(10) NOT NULL DEFAULT 'en',
  status varchar(32) NOT NULL DEFAULT 'ACTIVE',
  created_by integer REFERENCES users(id),
  updated_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_help_content_page_field_lang ON help_content(page, field_key, language);
CREATE INDEX IF NOT EXISTS idx_help_content_page ON help_content(page);
CREATE INDEX IF NOT EXISTS idx_help_content_field ON help_content(field_key);
CREATE INDEX IF NOT EXISTS idx_help_content_status ON help_content(status);

CREATE TABLE IF NOT EXISTS listing_templates (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  industry varchar(128),
  category varchar(128) NOT NULL,
  description text,
  template_data text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'ACTIVE',
  created_by integer REFERENCES users(id),
  updated_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_templates_industry ON listing_templates(industry);
CREATE INDEX IF NOT EXISTS idx_listing_templates_category ON listing_templates(category);
CREATE INDEX IF NOT EXISTS idx_listing_templates_status ON listing_templates(status);

CREATE TABLE IF NOT EXISTS help_articles (
  id serial PRIMARY KEY,
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  role varchar(64) NOT NULL DEFAULT 'GENERAL',
  category varchar(64) NOT NULL,
  summary text,
  content text NOT NULL,
  tags text,
  status varchar(32) NOT NULL DEFAULT 'DRAFT',
  published_at timestamp,
  view_count integer NOT NULL DEFAULT 0,
  created_by integer REFERENCES users(id),
  updated_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_help_article_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_role ON help_articles(role);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON help_articles(status);

CREATE TABLE IF NOT EXISTS help_faqs (
  id serial PRIMARY KEY,
  question varchar(500) NOT NULL,
  answer text NOT NULL,
  role varchar(64) NOT NULL DEFAULT 'GENERAL',
  category varchar(64) NOT NULL DEFAULT 'Getting Started',
  sort_order integer NOT NULL DEFAULT 0,
  status varchar(32) NOT NULL DEFAULT 'ACTIVE',
  created_by integer REFERENCES users(id),
  updated_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_help_faqs_role ON help_faqs(role);
CREATE INDEX IF NOT EXISTS idx_help_faqs_category ON help_faqs(category);
CREATE INDEX IF NOT EXISTS idx_help_faqs_status ON help_faqs(status);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  role varchar(64) NOT NULL,
  checklist text NOT NULL DEFAULT '{}',
  current_step varchar(64),
  completion_pct integer NOT NULL DEFAULT 0,
  skipped boolean NOT NULL DEFAULT false,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_user_role ON onboarding_progress(user_id, role);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);

CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  session_key varchar(128) NOT NULL,
  role_hint varchar(64),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chatbot_session_key ON chatbot_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user ON chatbot_sessions(user_id);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id serial PRIMARY KEY,
  session_id integer NOT NULL REFERENCES chatbot_sessions(id),
  role varchar(16) NOT NULL,
  intent varchar(64),
  content text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session ON chatbot_messages(session_id);

CREATE TABLE IF NOT EXISTS help_article_feedback (
  id serial PRIMARY KEY,
  article_id integer NOT NULL REFERENCES help_articles(id),
  user_id integer REFERENCES users(id),
  helpful boolean NOT NULL,
  comment text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_help_feedback_article ON help_article_feedback(article_id);
