-- Mirrors the six demo accounts SecurityConfig seeds in-memory (username =
-- lowercased role, password dice-demo). This table only carries their
-- profile data; it plays no part in authentication.
INSERT INTO users (id, username, email, full_name, role, active)
VALUES
    (gen_random_uuid(), 'sales_rep', 'sales_rep@dice.local', 'Demo Sales Rep', 'SALES_REP', TRUE),
    (gen_random_uuid(), 'sales_manager', 'sales_manager@dice.local', 'Demo Sales Manager', 'SALES_MANAGER', TRUE),
    (gen_random_uuid(), 'finance', 'finance@dice.local', 'Demo Finance', 'FINANCE', TRUE),
    (gen_random_uuid(), 'operations', 'operations@dice.local', 'Demo Operations', 'OPERATIONS', TRUE),
    (gen_random_uuid(), 'admin', 'admin@dice.local', 'Demo Admin', 'ADMIN', TRUE),
    (gen_random_uuid(), 'customer', 'customer@dice.local', 'Demo Customer', 'CUSTOMER', TRUE)
ON CONFLICT (username) DO NOTHING;
