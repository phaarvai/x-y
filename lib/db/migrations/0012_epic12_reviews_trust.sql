-- EPIC 12: Reviews, Ratings, Trust & Safety

CREATE TABLE IF NOT EXISTS platform_review_settings (
  id serial PRIMARY KEY,
  moderation_enabled boolean NOT NULL DEFAULT true,
  max_comment_length integer NOT NULL DEFAULT 1000,
  updated_by integer REFERENCES users(id),
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO platform_review_settings (moderation_enabled, max_comment_length)
SELECT true, 1000
WHERE NOT EXISTS (SELECT 1 FROM platform_review_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS feedback (
  id serial PRIMARY KEY,
  booking_id integer NOT NULL REFERENCES bookings(id),
  request_id integer,
  facility_id integer,
  reviewer_user_id integer NOT NULL REFERENCES users(id),
  reviewed_user_id integer NOT NULL REFERENCES users(id),
  overall_rating integer NOT NULL,
  quality_rating integer NOT NULL,
  communication_rating integer NOT NULL,
  timeliness_rating integer NOT NULL,
  comment text,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  moderation_status varchar(32) NOT NULL DEFAULT 'PENDING',
  moderation_notes text,
  moderated_by integer REFERENCES users(id),
  moderated_at timestamp,
  is_reported boolean NOT NULL DEFAULT false,
  is_verified_booking boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT feedback_rating_range CHECK (
    overall_rating BETWEEN 1 AND 5 AND
    quality_rating BETWEEN 1 AND 5 AND
    communication_rating BETWEEN 1 AND 5 AND
    timeliness_rating BETWEEN 1 AND 5
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_booking_reviewer ON feedback(booking_id, reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_booking ON feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_feedback_facility ON feedback(facility_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewer ON feedback(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed ON feedback(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_overall ON feedback(overall_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

CREATE TABLE IF NOT EXISTS rating_summaries (
  id serial PRIMARY KEY,
  entity_type varchar(64) NOT NULL,
  entity_id integer NOT NULL,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  quality_avg numeric(3,2) DEFAULT 0,
  communication_avg numeric(3,2) DEFAULT 0,
  timeliness_avg numeric(3,2) DEFAULT 0,
  distribution text,
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rating_summary_entity ON rating_summaries(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS reported_reviews (
  id serial PRIMARY KEY,
  review_id integer NOT NULL REFERENCES feedback(id),
  reported_by integer NOT NULL REFERENCES users(id),
  reason varchar(64) NOT NULL,
  description text,
  status varchar(32) NOT NULL DEFAULT 'OPEN',
  handled_by integer REFERENCES users(id),
  handled_at timestamp,
  resolution_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_review_user ON reported_reviews(review_id, reported_by);
CREATE INDEX IF NOT EXISTS idx_reported_review ON reported_reviews(review_id);
CREATE INDEX IF NOT EXISTS idx_reported_status ON reported_reviews(status);

CREATE TABLE IF NOT EXISTS verifications (
  id serial PRIMARY KEY,
  entity_type varchar(64) NOT NULL,
  entity_id integer NOT NULL,
  verification_type varchar(64) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  verified_by integer REFERENCES users(id),
  verification_reason text,
  notes text,
  verified_at timestamp,
  expires_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_entity ON verifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verification_type ON verifications(verification_type);

CREATE TABLE IF NOT EXISTS verification_history (
  id serial PRIMARY KEY,
  verification_id integer NOT NULL REFERENCES verifications(id),
  action varchar(64) NOT NULL,
  from_status varchar(32),
  to_status varchar(32) NOT NULL,
  performed_by integer REFERENCES users(id),
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_history_ver ON verification_history(verification_id);
