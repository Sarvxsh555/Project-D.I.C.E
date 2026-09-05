-- Per-warehouse stock. Replaces (for reservation purposes) the single global
-- Product.stock_on_hand counter the legacy fulfillment preview still reads.

CREATE TABLE inventory (
    id            CHAR(36) PRIMARY KEY,
    warehouse_id  CHAR(36) NOT NULL,
    product_id    CHAR(36) NOT NULL,
    available_qty INTEGER NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
    reserved_qty  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
    fulfilled_qty INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_qty >= 0),
    version       BIGINT  NOT NULL DEFAULT 0,
    UNIQUE (warehouse_id, product_id),

    CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_inventory_warehouse ON inventory (warehouse_id);

ALTER TABLE warehouses ADD COLUMN shipping_cost_factor NUMERIC(6, 2) NOT NULL DEFAULT 1.00;
