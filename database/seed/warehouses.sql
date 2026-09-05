-- Minimal seed data for local/demo use. Safe to re-run.
INSERT IGNORE INTO warehouses (id, odoo_warehouse_id, code, name, region, dispatch_days, active)
VALUES
    (UUID(), 1, 'WH-EAST', 'East Coast DC', 'US-EAST', 1, TRUE),
    (UUID(), 2, 'WH-WEST', 'West Coast DC', 'US-WEST', 2, TRUE),
    (UUID(), 3, 'WH-EU',   'EU Distribution Center', 'EU', 3, TRUE);
