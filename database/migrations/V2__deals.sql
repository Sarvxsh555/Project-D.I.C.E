-- The aggregate root and its lines.

CREATE TABLE deals (
    id                       UUID PRIMARY KEY,
    deal_number              VARCHAR(32)    NOT NULL UNIQUE,
    odoo_quotation_id        BIGINT UNIQUE,
    customer_id              UUID           NOT NULL REFERENCES customers (id),
    status                   VARCHAR(32)    NOT NULL,
    currency                 VARCHAR(3)     NOT NULL DEFAULT 'USD',
    subtotal                 NUMERIC(18, 2) NOT NULL DEFAULT 0,
    discount_amount          NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_amount             NUMERIC(18, 2) NOT NULL DEFAULT 0,
    margin_percent           NUMERIC(7, 4)  NOT NULL DEFAULT 0,
    risk_level               VARCHAR(16)    NOT NULL DEFAULT 'LOW',
    health_score             INTEGER        NOT NULL DEFAULT 100,
    billing_status           VARCHAR(32)    NOT NULL DEFAULT 'NOT_INVOICED',
    requested_delivery_date  DATE,
    owner_username           VARCHAR(128),
    -- Optimistic locking: an Odoo webhook and a portal counter-offer can
    -- otherwise interleave on the same quotation.
    version                  BIGINT         NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT deals_health_score_range CHECK (health_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_deals_status ON deals (status);
CREATE INDEX idx_deals_customer ON deals (customer_id);
CREATE INDEX idx_deals_owner ON deals (owner_username);

CREATE TABLE deal_lines (
    id                  UUID PRIMARY KEY,
    deal_id             UUID           NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    product_id          UUID           NOT NULL REFERENCES products (id),
    line_number         INTEGER        NOT NULL DEFAULT 1,
    quantity            INTEGER        NOT NULL,
    unit_price          NUMERIC(18, 2) NOT NULL,
    discount_percent    NUMERIC(7, 4)  NOT NULL DEFAULT 0,
    line_total          NUMERIC(18, 2) NOT NULL DEFAULT 0,
    margin_percent      NUMERIC(7, 4)  NOT NULL DEFAULT 0,
    warehouse_id        UUID REFERENCES warehouses (id),
    fulfillment_status  VARCHAR(32)    NOT NULL DEFAULT 'NOT_STARTED',

    CONSTRAINT deal_lines_quantity_positive CHECK (quantity > 0),
    CONSTRAINT deal_lines_discount_range CHECK (discount_percent BETWEEN 0 AND 100)
);

CREATE INDEX idx_deal_lines_deal ON deal_lines (deal_id);
