-- Freezes the commercial state a quotation actually had when it cleared its
-- final sequential approval — deals/deal_lines stay live and editable after.

CREATE TABLE approval_snapshots (
    id              UUID PRIMARY KEY,
    deal_id         UUID           NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    approval_id     UUID           NOT NULL REFERENCES approvals (id),
    customer_name   VARCHAR(255)   NOT NULL,
    currency        VARCHAR(3)     NOT NULL,
    subtotal        NUMERIC(18, 2) NOT NULL,
    discount_amount NUMERIC(18, 2) NOT NULL,
    total_amount    NUMERIC(18, 2) NOT NULL,
    margin_percent  NUMERIC(7, 4),
    captured_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_snapshots_deal ON approval_snapshots (deal_id);

CREATE TABLE approval_snapshot_items (
    id               UUID PRIMARY KEY,
    snapshot_id      UUID           NOT NULL REFERENCES approval_snapshots (id) ON DELETE CASCADE,
    product_sku      VARCHAR(64)    NOT NULL,
    product_name     VARCHAR(255)   NOT NULL,
    quantity         INTEGER        NOT NULL,
    unit_price       NUMERIC(18, 2) NOT NULL,
    discount_percent NUMERIC(7, 4)  NOT NULL,
    line_total       NUMERIC(18, 2) NOT NULL,
    margin_percent   NUMERIC(7, 4)
);

CREATE INDEX idx_approval_snapshot_items_snapshot ON approval_snapshot_items (snapshot_id);
