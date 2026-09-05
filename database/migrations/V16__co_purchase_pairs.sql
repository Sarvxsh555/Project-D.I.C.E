-- Co-purchase pairing table: encodes which products are frequently bought
-- together, with a weight driving ranking and an optional promotion label.
-- Seeded from historical patterns in demo_deals and domain knowledge.

CREATE TABLE co_purchase_pairs (
    id              CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    product_sku     VARCHAR(64)  NOT NULL,
    paired_sku      VARCHAR(64)  NOT NULL,
    weight          INTEGER      NOT NULL DEFAULT 1 CHECK (weight > 0),
    promotion_label VARCHAR(128),
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (product_sku, paired_sku)
);

CREATE INDEX idx_co_purchase_product ON co_purchase_pairs (product_sku);

-- Comment: product_sku is the "trigger" SKU, paired_sku is the recommendation.
-- weight is the base score; promotion_label activates a +50% bonus in the engine.
