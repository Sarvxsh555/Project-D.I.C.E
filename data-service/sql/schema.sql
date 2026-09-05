-- DealFlow360 data-service schema. No ORM — this file is the contract.
-- Java services map onto these names via Spring's snake_case strategy.
-- Node engines go through POST /internal/sql (they do not open Postgres themselves).

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SALES_REP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  customer_id BIGINT
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id BIGSERIAL PRIMARY KEY,
  jti TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS product (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  category TEXT,
  variant TEXT,
  unit_price DOUBLE PRECISION DEFAULT 0,
  cost_price DOUBLE PRECISION DEFAULT 0,
  tax_rate DOUBLE PRECISION DEFAULT 0,
  unit TEXT,
  description TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS customer (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  tier TEXT,
  email TEXT,
  region TEXT
);

CREATE TABLE IF NOT EXISTS customer_price (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT,
  product_id BIGINT,
  price DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS price_list_entry (
  id BIGSERIAL PRIMARY KEY,
  customer_tier TEXT,
  currency TEXT,
  product TEXT,
  price DOUBLE PRECISION,
  effective_date TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS discount_rule (
  id BIGSERIAL PRIMARY KEY,
  customer_tier TEXT,
  category TEXT,
  min_discount DOUBLE PRECISION,
  max_discount DOUBLE PRECISION,
  risk_level TEXT,
  approval_level TEXT
);

CREATE TABLE IF NOT EXISTS warehouse (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  location TEXT,
  stock INTEGER DEFAULT 0,
  replenishment TEXT,
  shipping_weight TEXT
);

CREATE TABLE IF NOT EXISTS subscription_plan (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  billing_cycle TEXT,
  price DOUBLE PRECISION,
  proration TEXT,
  cancellation TEXT,
  refund TEXT
);

CREATE TABLE IF NOT EXISTS task (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date DATE,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  icon TEXT DEFAULT '•',
  title TEXT NOT NULL,
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_request (
  id SERIAL PRIMARY KEY,
  quotation_id BIGINT NOT NULL,
  quote_version_hash TEXT NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL,
  required_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_step (
  id SERIAL PRIMARY KEY,
  approval_request_id INTEGER NOT NULL REFERENCES approval_request(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  required_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  decided_by TEXT,
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS approval_decision (
  id SERIAL PRIMARY KEY,
  approval_request_id INTEGER NOT NULL REFERENCES approval_request(id) ON DELETE CASCADE,
  approval_step_id INTEGER REFERENCES approval_step(id),
  decided_by TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  quote_version_hash_at_decision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_request_quotation ON approval_request(quotation_id);

CREATE TABLE IF NOT EXISTS invoice (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  amount DOUBLE PRECISION NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  period_start DATE,
  period_end DATE
);

CREATE TABLE IF NOT EXISTS invoice_line (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL,
  amount DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT,
  product_name TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL,
  billing_cycle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_schedule (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  invoice_id INTEGER REFERENCES invoice(id)
);

CREATE TABLE IF NOT EXISTS credit_note (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  subscription_id INTEGER REFERENCES subscription(id),
  amount DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refund (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  subscription_id INTEGER REFERENCES subscription(id),
  amount DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS negotiation_event (
  id SERIAL PRIMARY KEY,
  quotation_id BIGINT NOT NULL,
  line_id BIGINT,
  event_type TEXT NOT NULL,
  message TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'OPEN',
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_negotiation_version (
  id SERIAL PRIMARY KEY,
  quotation_id BIGINT NOT NULL,
  negotiation_event_id INTEGER REFERENCES negotiation_event(id),
  version_label TEXT NOT NULL,
  stage TEXT NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  discount_total DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  margin_percent DOUBLE PRECISION NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_username ON task(username);
CREATE INDEX IF NOT EXISTS idx_notification_username ON notification(username);
CREATE INDEX IF NOT EXISTS idx_negotiation_event_quotation ON negotiation_event(quotation_id);
