-- Price list foundation: a price list optionally scoped to a customer tier
-- or segment, holding one price per product. Resolution picks the most
-- specific matching list; see PriceResolutionService.

CREATE TABLE price_lists (
    id                CHAR(36)     PRIMARY KEY,
    code              VARCHAR(64)  NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    currency          VARCHAR(3)   NOT NULL DEFAULT 'USD',
    customer_segment  VARCHAR(32),
    customer_tier     VARCHAR(32),
    priority          INTEGER      NOT NULL DEFAULT 100,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT price_lists_segment_valid
        CHECK (customer_segment IS NULL OR customer_segment IN (
            'ENTERPRISE', 'MID_MARKET', 'SMB', 'PARTNER'
        ))
);

CREATE INDEX idx_price_lists_active ON price_lists (active);

CREATE TABLE price_list_items (
    id             CHAR(36) PRIMARY KEY,
    price_list_id  CHAR(36) NOT NULL,
    product_id     CHAR(36) NOT NULL,
    unit_price     NUMERIC(18, 2) NOT NULL,

    CONSTRAINT price_list_items_unique UNIQUE (price_list_id, product_id),
    CONSTRAINT price_list_items_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT fk_price_list_items_price_list FOREIGN KEY (price_list_id) REFERENCES price_lists (id),
    CONSTRAINT fk_price_list_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX idx_price_list_items_product ON price_list_items (product_id);
