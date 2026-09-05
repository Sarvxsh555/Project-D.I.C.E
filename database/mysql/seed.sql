-- D.I.C.E. MySQL 8.4 Enterprise Seed Data
USE dealflow360;

-- Users
INSERT IGNORE INTO users (id, username, full_name, email, role, active) VALUES
(UUID_TO_BIN(UUID()), 'admin', 'Executive Administrator', 'admin@dice.enterprise', 'ADMIN', TRUE),
(UUID_TO_BIN(UUID()), 'sales_rep', 'Sarah Jenkins', 's.jenkins@dice.enterprise', 'SALES_REP', TRUE),
(UUID_TO_BIN(UUID()), 'sales_manager', 'Michael Chang', 'm.chang@dice.enterprise', 'SALES_MANAGER', TRUE),
(UUID_TO_BIN(UUID()), 'finance', 'David Vance', 'd.vance@dice.enterprise', 'FINANCE', TRUE),
(UUID_TO_BIN(UUID()), 'operations', 'Elena Rostova', 'e.rostova@dice.enterprise', 'OPERATIONS', TRUE),
(UUID_TO_BIN(UUID()), 'customer', 'Rajesh Sharma', 'r.sharma@tcs.com', 'CUSTOMER', TRUE);

-- Warehouses
INSERT IGNORE INTO warehouses (id, code, name, region, dispatch_days, shipping_cost_factor, active) VALUES
(UUID_TO_BIN(UUID()), 'WH-A', 'Main Logistics Hub - Bangalore', 'APAC-SOUTH', 1, 1.00, TRUE),
(UUID_TO_BIN(UUID()), 'WH-B', 'Western Regional Center - Mumbai', 'APAC-WEST', 2, 1.15, TRUE),
(UUID_TO_BIN(UUID()), 'WH-C', 'Northern Depot - Delhi NCR', 'APAC-NORTH', 2, 1.20, TRUE);

-- Products
INSERT IGNORE INTO products (id, sku, name, category, list_price, standard_cost, floor_price, uom, stock_on_hand, lead_time_days, active) VALUES
(UUID_TO_BIN(UUID()), 'DICE-PLAT-ENT', 'D.I.C.E. Enterprise Core Platform', 'SOFTWARE', 45000.00, 12000.00, 30000.00, 'UNIT', 150, 0, TRUE),
(UUID_TO_BIN(UUID()), 'DICE-MOD-AI', 'Neural Predictive Pricing Engine', 'MODULE', 18500.00, 4200.00, 12000.00, 'UNIT', 320, 0, TRUE),
(UUID_TO_BIN(UUID()), 'DICE-SRV-IMP', 'Enterprise Deployment & System Integration', 'SERVICE', 25000.00, 8000.00, 18000.00, 'PACKAGE', 999, 5, TRUE),
(UUID_TO_BIN(UUID()), 'DICE-SEC-HSM', 'High-Assurance Cryptographic Appliance', 'HARDWARE', 32000.00, 19500.00, 24000.00, 'UNIT', 85, 14, TRUE),
(UUID_TO_BIN(UUID()), 'DICE-SUP-247', '24x7 Mission-Critical Tier-1 SLA', 'SUPPORT', 12000.00, 2500.00, 8500.00, 'ANNUAL', 999, 0, TRUE);

-- Customers
INSERT IGNORE INTO customers (id, name, segment, tier, region, credit_limit, outstanding_balance, payment_terms_days, risk_score, on_time_payment_rate, portal_username, active) VALUES
(UUID_TO_BIN(UUID()), 'Tata Consultancy Services', 'ENTERPRISE', 'PLATINUM', 'APAC-IN', 1500000.00, 240000.00, 45, 12, 98.50, 'customer', TRUE),
(UUID_TO_BIN(UUID()), 'Infosys Limited', 'ENTERPRISE', 'GOLD', 'APAC-IN', 1200000.00, 180000.00, 30, 18, 96.00, NULL, TRUE),
(UUID_TO_BIN(UUID()), 'Wipro Technologies', 'MID_MARKET', 'SILVER', 'APAC-IN', 600000.00, 95000.00, 30, 28, 91.50, NULL, TRUE),
(UUID_TO_BIN(UUID()), 'HCL Technologies', 'MID_MARKET', 'SILVER', 'APAC-IN', 500000.00, 110000.00, 30, 32, 89.00, NULL, TRUE),
(UUID_TO_BIN(UUID()), 'Tech Mahindra', 'ENTERPRISE', 'GOLD', 'APAC-IN', 900000.00, 145000.00, 45, 22, 94.20, NULL, TRUE);
