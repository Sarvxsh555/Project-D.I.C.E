-- The aggregate root and its lines.

CREATE TABLE deals (
    id                       CHAR(36)       PRIMARY KEY,
    deal_number              VARCHAR(32)    NOT NULL UNIQUE,
    odoo_quotation_id        BIGINT UNIQUE,
    customer_id              CHAR(36)       NOT NULL,
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
    created_at               DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT deals_health_score_range CHECK (health_score BETWEEN 0 AND 100),
    CONSTRAINT fk_deals_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX idx_deals_status ON deals (status);
CREATE INDEX idx_deals_customer ON deals (customer_id);
CREATE INDEX idx_deals_owner ON deals (owner_username);

CREATE TABLE deal_lines (
    id                  CHAR(36)       PRIMARY KEY,
    deal_id             CHAR(36)       NOT NULL,
    product_id          CHAR(36)       NOT NULL,
    line_number         INTEGER        NOT NULL DEFAULT 1,
    quantity            INTEGER        NOT NULL,
    unit_price          NUMERIC(18, 2) NOT NULL,
    discount_percent    NUMERIC(7, 4)  NOT NULL DEFAULT 0,
    line_total          NUMERIC(18, 2) NOT NULL DEFAULT 0,
    margin_percent      NUMERIC(7, 4)  NOT NULL DEFAULT 0,
    warehouse_id        CHAR(36),
    fulfillment_status  VARCHAR(32)    NOT NULL DEFAULT 'NOT_STARTED',

    CONSTRAINT deal_lines_quantity_positive CHECK (quantity > 0),
    CONSTRAINT deal_lines_discount_range CHECK (discount_percent BETWEEN 0 AND 100),
    CONSTRAINT fk_deal_lines_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_deal_lines_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_deal_lines_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
);

CREATE INDEX idx_deal_lines_deal ON deal_lines (deal_id);
