-- Mirrors the six demo accounts SecurityConfig seeds in-memory (username =
-- lowercased role, password dice-demo). This table only carries their
-- profile data; it plays no part in authentication.
INSERT IGNORE INTO users (id, username, email, full_name, role, active)
VALUES
    (UUID(), 'sales_rep', 'sales_rep@dice.local', 'Demo Sales Rep', 'SALES_REP', TRUE),
    (UUID(), 'sales_manager', 'sales_manager@dice.local', 'Demo Sales Manager', 'SALES_MANAGER', TRUE),
    (UUID(), 'finance', 'finance@dice.local', 'Demo Finance', 'FINANCE', TRUE),
    (UUID(), 'operations', 'operations@dice.local', 'Demo Operations', 'OPERATIONS', TRUE),
    (UUID(), 'admin', 'admin@dice.local', 'Demo Admin', 'ADMIN', TRUE),
    (UUID(), 'customer', 'customer@dice.local', 'Demo Customer', 'CUSTOMER', TRUE);
