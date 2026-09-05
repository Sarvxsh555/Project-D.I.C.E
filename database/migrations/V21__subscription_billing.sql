-- Commit 20/21: hybrid one-time/recurring billing, subscriptions and payments.

ALTER TABLE deal_lines
    ADD COLUMN billing_mode      VARCHAR(16) NOT NULL DEFAULT 'ONE_TIME',
    ADD COLUMN subscription_plan_id UUID;

CREATE TABLE subscription_plans (
    id          UUID PRIMARY KEY,
    name        VARCHAR(128)   NOT NULL,
    product_id  UUID REFERENCES products (id),
    interval    VARCHAR(16)    NOT NULL,
    price       NUMERIC(18, 2) NOT NULL,
    currency    VARCHAR(3)     NOT NULL DEFAULT 'USD',
    active      BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE deal_lines
    ADD CONSTRAINT fk_deal_lines_subscription_plan
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans (id);

CREATE TABLE subscriptions (
    id                 UUID PRIMARY KEY,
    customer_id        UUID        NOT NULL REFERENCES customers (id),
    deal_id            UUID        NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    deal_line_id       UUID        NOT NULL REFERENCES deal_lines (id) ON DELETE CASCADE,
    plan_id            UUID        NOT NULL REFERENCES subscription_plans (id),
    start_date         DATE        NOT NULL,
    next_billing_date  DATE        NOT NULL,
    status             VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT subscriptions_deal_line_unique UNIQUE (deal_line_id)
);

CREATE INDEX idx_subscriptions_customer ON subscriptions (customer_id);
CREATE INDEX idx_subscriptions_deal ON subscriptions (deal_id);

CREATE TABLE subscription_billing_schedules (
    id                 UUID PRIMARY KEY,
    subscription_id    UUID        NOT NULL UNIQUE REFERENCES subscriptions (id) ON DELETE CASCADE,
    frequency          VARCHAR(16) NOT NULL,
    next_billing_date  DATE        NOT NULL,
    active             BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE invoices (
    id              UUID PRIMARY KEY,
    deal_id         UUID           NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    customer_id     UUID           NOT NULL REFERENCES customers (id),
    subscription_id UUID REFERENCES subscriptions (id),
    status          VARCHAR(16)    NOT NULL DEFAULT 'DRAFT',
    currency        VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_amount    NUMERIC(18, 2) NOT NULL,
    due_date        DATE,
    issued_at       TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_deal ON invoices (deal_id);
CREATE INDEX idx_invoices_customer ON invoices (customer_id);
CREATE INDEX idx_invoices_subscription ON invoices (subscription_id);

CREATE TABLE invoice_lines (
    id          UUID PRIMARY KEY,
    invoice_id  UUID           NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    sku         VARCHAR(64),
    description VARCHAR(255)   NOT NULL,
    quantity    INTEGER        NOT NULL,
    unit_price  NUMERIC(18, 2) NOT NULL,
    amount      NUMERIC(18, 2) NOT NULL
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_lines (invoice_id);

CREATE TABLE payments (
    id                    UUID PRIMARY KEY,
    invoice_id            UUID           NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    customer_id           UUID           NOT NULL REFERENCES customers (id),
    amount                NUMERIC(18, 2) NOT NULL,
    currency              VARCHAR(3)     NOT NULL DEFAULT 'USD',
    status                VARCHAR(16)    NOT NULL DEFAULT 'PENDING',
    idempotency_key       VARCHAR(128)   NOT NULL UNIQUE,
    transaction_reference VARCHAR(128),
    failure_reason        TEXT,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments (invoice_id);
