-- Commit 20/21: hybrid one-time/recurring billing, subscriptions and payments.

ALTER TABLE deal_lines
    ADD COLUMN billing_mode      VARCHAR(16) NOT NULL DEFAULT 'ONE_TIME',
    ADD COLUMN subscription_plan_id CHAR(36);

CREATE TABLE subscription_plans (
    id          CHAR(36)       PRIMARY KEY,
    name        VARCHAR(128)   NOT NULL,
    product_id  CHAR(36),
    interval_unit VARCHAR(16)  NOT NULL,
    price       NUMERIC(18, 2) NOT NULL,
    currency    VARCHAR(3)     NOT NULL DEFAULT 'USD',
    active      BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_subscription_plans_product FOREIGN KEY (product_id) REFERENCES products (id)
);

ALTER TABLE deal_lines
    ADD CONSTRAINT fk_deal_lines_subscription_plan
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans (id);

CREATE TABLE subscriptions (
    id                 CHAR(36)    PRIMARY KEY,
    customer_id        CHAR(36)    NOT NULL,
    deal_id            CHAR(36)    NOT NULL,
    deal_line_id       CHAR(36)    NOT NULL,
    plan_id            CHAR(36)    NOT NULL,
    start_date         DATE        NOT NULL,
    next_billing_date  DATE        NOT NULL,
    status             VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT subscriptions_deal_line_unique UNIQUE (deal_line_id),
    CONSTRAINT fk_subscriptions_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_subscriptions_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_deal_line FOREIGN KEY (deal_line_id) REFERENCES deal_lines (id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
);

CREATE INDEX idx_subscriptions_customer ON subscriptions (customer_id);
CREATE INDEX idx_subscriptions_deal ON subscriptions (deal_id);

CREATE TABLE subscription_billing_schedules (
    id                 CHAR(36)    PRIMARY KEY,
    subscription_id    CHAR(36)    NOT NULL UNIQUE,
    frequency          VARCHAR(16) NOT NULL,
    next_billing_date  DATE        NOT NULL,
    active             BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_subscription_billing_schedules_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
);

CREATE TABLE invoices (
    id              CHAR(36)       PRIMARY KEY,
    deal_id         CHAR(36)       NOT NULL,
    customer_id     CHAR(36)       NOT NULL,
    subscription_id CHAR(36),
    status          VARCHAR(16)    NOT NULL DEFAULT 'DRAFT',
    currency        VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_amount    NUMERIC(18, 2) NOT NULL,
    due_date        DATE,
    issued_at       DATETIME,
    paid_at         DATETIME,
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoices_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
);

CREATE INDEX idx_invoices_deal ON invoices (deal_id);
CREATE INDEX idx_invoices_customer ON invoices (customer_id);
CREATE INDEX idx_invoices_subscription ON invoices (subscription_id);

CREATE TABLE invoice_lines (
    id          CHAR(36)       PRIMARY KEY,
    invoice_id  CHAR(36)       NOT NULL,
    sku         VARCHAR(64),
    description VARCHAR(255)   NOT NULL,
    quantity    INTEGER        NOT NULL,
    unit_price  NUMERIC(18, 2) NOT NULL,
    amount      NUMERIC(18, 2) NOT NULL,

    CONSTRAINT fk_invoice_lines_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_lines (invoice_id);

CREATE TABLE payments (
    id                    CHAR(36)       PRIMARY KEY,
    invoice_id            CHAR(36)       NOT NULL,
    customer_id           CHAR(36)       NOT NULL,
    amount                NUMERIC(18, 2) NOT NULL,
    currency              VARCHAR(3)     NOT NULL DEFAULT 'USD',
    status                VARCHAR(16)    NOT NULL DEFAULT 'PENDING',
    idempotency_key       VARCHAR(128)   NOT NULL UNIQUE,
    transaction_reference VARCHAR(128),
    failure_reason        TEXT,
    created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX idx_payments_invoice ON payments (invoice_id);
