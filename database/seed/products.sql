-- TODO: expand catalogue as needed for demo scenarios.
INSERT IGNORE INTO products (id, odoo_product_id, sku, name, category, list_price, standard_cost, floor_price, uom, stock_on_hand, lead_time_days, active)
VALUES
    (UUID(), 101, 'SKU-1001', 'Standard Widget', 'WIDGETS', 100.00, 60.00, 70.00, 'UNIT', 500, 2, TRUE),
    (UUID(), 102, 'SKU-1002', 'Premium Widget', 'WIDGETS', 250.00, 140.00, 175.00, 'UNIT', 200, 3, TRUE),
    (UUID(), 103, 'SKU-2001', 'Basic Gadget', 'GADGETS', 45.00, 30.00, 32.00, 'UNIT', 1000, 1, TRUE),
    (UUID(), 104, 'SKU-2002', 'Pro Gadget', 'GADGETS', 180.00, 95.00, 120.00, 'UNIT', 150, 5, TRUE);
