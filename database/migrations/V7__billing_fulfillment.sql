-- Invoice schedules and shipment records. DICE plans these; Odoo posts them.

CREATE TABLE invoice_schedules (
    id                  UUID PRIMARY KEY,
    deal_id             UUID           NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    currency            VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_amount        NUMERIC(18, 2) NOT NULL,
    payment_terms_days  INTEGER        NOT NULL DEFAULT 30,
    odoo_invoice_id     BIGINT UNIQUE,
    status              VARCHAR(32)    NOT NULL DEFAULT 'DRAFT_INVOICE',
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_schedules_deal ON invoice_schedules (deal_id);

CREATE TABLE invoice_installments (
    id           UUID PRIMARY KEY,
    schedule_id  UUID           NOT NULL REFERENCES invoice_schedules (id) ON DELETE CASCADE,
    code         VARCHAR(32)    NOT NULL,
    label        VARCHAR(255)   NOT NULL,
    amount       NUMERIC(18, 2) NOT NULL,
    due_date     DATE           NOT NULL,
    paid_at      TIMESTAMPTZ,

    CONSTRAINT invoice_installments_unique_code UNIQUE (schedule_id, code)
);

CREATE TABLE shipments (
    id                  UUID PRIMARY KEY,
    deal_id             UUID        NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    deal_line_id        UUID REFERENCES deal_lines (id) ON DELETE CASCADE,
    warehouse_id        UUID REFERENCES warehouses (id),
    allocated_quantity  INTEGER     NOT NULL DEFAULT 0,
    status              VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
    expected_ship_date  DATE,
    shipped_at          TIMESTAMPTZ,
    tracking_reference  VARCHAR(128),

    CONSTRAINT shipments_quantity_non_negative CHECK (allocated_quantity >= 0)
);

CREATE INDEX idx_shipments_deal ON shipments (deal_id);
