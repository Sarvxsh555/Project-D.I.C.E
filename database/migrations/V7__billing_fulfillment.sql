-- Invoice schedules and shipment records. DICE plans these; Odoo posts them.

CREATE TABLE invoice_schedules (
    id                  CHAR(36)       PRIMARY KEY,
    deal_id             CHAR(36)       NOT NULL,
    currency            VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_amount        NUMERIC(18, 2) NOT NULL,
    payment_terms_days  INTEGER        NOT NULL DEFAULT 30,
    odoo_invoice_id     BIGINT UNIQUE,
    status              VARCHAR(32)    NOT NULL DEFAULT 'DRAFT_INVOICE',
    created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_schedules_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_schedules_deal ON invoice_schedules (deal_id);

CREATE TABLE invoice_installments (
    id           CHAR(36)       PRIMARY KEY,
    schedule_id  CHAR(36)       NOT NULL,
    code         VARCHAR(32)    NOT NULL,
    label        VARCHAR(255)   NOT NULL,
    amount       NUMERIC(18, 2) NOT NULL,
    due_date     DATE           NOT NULL,
    paid_at      DATETIME,

    CONSTRAINT invoice_installments_unique_code UNIQUE (schedule_id, code),
    CONSTRAINT fk_invoice_installments_schedule FOREIGN KEY (schedule_id) REFERENCES invoice_schedules (id) ON DELETE CASCADE
);

CREATE TABLE shipments (
    id                  CHAR(36)    PRIMARY KEY,
    deal_id             CHAR(36)    NOT NULL,
    deal_line_id        CHAR(36),
    warehouse_id        CHAR(36),
    allocated_quantity  INTEGER     NOT NULL DEFAULT 0,
    status              VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
    expected_ship_date  DATE,
    shipped_at          DATETIME,
    tracking_reference  VARCHAR(128),

    CONSTRAINT shipments_quantity_non_negative CHECK (allocated_quantity >= 0),
    CONSTRAINT fk_shipments_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_shipments_deal_line FOREIGN KEY (deal_line_id) REFERENCES deal_lines (id) ON DELETE CASCADE,
    CONSTRAINT fk_shipments_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
);

CREATE INDEX idx_shipments_deal ON shipments (deal_id);
