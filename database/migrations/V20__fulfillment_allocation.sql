-- Persisted warehouse-allocation outcome for a confirmed sales order. Distinct
-- from the transient preview the legacy single-warehouse FulfillmentEngine
-- returns — this is the durable record of what was actually reserved.

CREATE TABLE fulfillment_plans (
    id         UUID PRIMARY KEY,
    deal_id    UUID         NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    created_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fulfillment_plans_deal ON fulfillment_plans (deal_id);

CREATE TABLE fulfillment_allocation_lines (
    id           UUID PRIMARY KEY,
    plan_id      UUID    NOT NULL REFERENCES fulfillment_plans (id) ON DELETE CASCADE,
    deal_line_id UUID    NOT NULL REFERENCES deal_lines (id),
    product_id   UUID    NOT NULL REFERENCES products (id),
    warehouse_id UUID    REFERENCES warehouses (id),
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    status       VARCHAR(32) NOT NULL CHECK (status IN
        ('NOT_STARTED', 'ALLOCATED', 'PARTIALLY_ALLOCATED', 'BACKORDERED', 'SHIPPED', 'DELIVERED'))
);

CREATE INDEX idx_fulfillment_allocation_lines_plan ON fulfillment_allocation_lines (plan_id);
CREATE INDEX idx_fulfillment_allocation_lines_deal_line ON fulfillment_allocation_lines (deal_line_id);
