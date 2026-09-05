-- Persisted warehouse-allocation outcome for a confirmed sales order. Distinct
-- from the transient preview the legacy single-warehouse FulfillmentEngine
-- returns — this is the durable record of what was actually reserved.

CREATE TABLE fulfillment_plans (
    id         CHAR(36)     PRIMARY KEY,
    deal_id    CHAR(36)     NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fulfillment_plans_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
);

CREATE INDEX idx_fulfillment_plans_deal ON fulfillment_plans (deal_id);

CREATE TABLE fulfillment_allocation_lines (
    id           CHAR(36) PRIMARY KEY,
    plan_id      CHAR(36) NOT NULL,
    deal_line_id CHAR(36) NOT NULL,
    product_id   CHAR(36) NOT NULL,
    warehouse_id CHAR(36),
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    status       VARCHAR(32) NOT NULL CHECK (status IN
        ('NOT_STARTED', 'ALLOCATED', 'PARTIALLY_ALLOCATED', 'BACKORDERED', 'SHIPPED', 'DELIVERED')),

    CONSTRAINT fk_fulfillment_allocation_lines_plan FOREIGN KEY (plan_id) REFERENCES fulfillment_plans (id) ON DELETE CASCADE,
    CONSTRAINT fk_fulfillment_allocation_lines_deal_line FOREIGN KEY (deal_line_id) REFERENCES deal_lines (id),
    CONSTRAINT fk_fulfillment_allocation_lines_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_fulfillment_allocation_lines_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
);

CREATE INDEX idx_fulfillment_allocation_lines_plan ON fulfillment_allocation_lines (plan_id);
CREATE INDEX idx_fulfillment_allocation_lines_deal_line ON fulfillment_allocation_lines (deal_line_id);
