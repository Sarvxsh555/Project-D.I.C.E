-- Per-warehouse stock. Replaces (for reservation purposes) the single global
-- Product.stock_on_hand counter the legacy fulfillment preview still reads.

CREATE TABLE inventory (
    id            UUID PRIMARY KEY,
    warehouse_id  UUID    NOT NULL REFERENCES warehouses (id),
    product_id    UUID    NOT NULL REFERENCES products (id),
    available_qty INTEGER NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
    reserved_qty  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
    fulfilled_qty INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_qty >= 0),
    version       BIGINT  NOT NULL DEFAULT 0,
    UNIQUE (warehouse_id, product_id)
);

CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_inventory_warehouse ON inventory (warehouse_id);

ALTER TABLE warehouses ADD COLUMN shipping_cost_factor NUMERIC(6, 2) NOT NULL DEFAULT 1.00;
