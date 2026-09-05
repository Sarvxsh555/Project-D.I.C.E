-- Minimal seed data for local/demo use. Safe to re-run.
INSERT INTO warehouses (id, odoo_warehouse_id, code, name, region, dispatch_days, active)
VALUES
    (gen_random_uuid(), 1, 'WH-EAST', 'East Coast DC', 'US-EAST', 1, TRUE),
    (gen_random_uuid(), 2, 'WH-WEST', 'West Coast DC', 'US-WEST', 2, TRUE),
    (gen_random_uuid(), 3, 'WH-EU',   'EU Distribution Center', 'EU', 3, TRUE)
ON CONFLICT (code) DO NOTHING;
