-- ============================================================================
-- D.I.C.E — Deal Intelligence & Compliance Engine
-- 20 Essential MySQL Core Tables & Automated Seed Data
-- ============================================================================
-- Designed for MySQL 8.0+
-- Database: dice (or run standalone against any target database)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. ROLES (RBAC definition)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. USERS (Authentication & Profile)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id            VARCHAR(36)  PRIMARY KEY,
    name          VARCHAR(128) NOT NULL,
    email         VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT          NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role ON users (role_id);
CREATE INDEX idx_users_email ON users (email);

-- ----------------------------------------------------------------------------
-- 3. CUSTOMER TIERS (Tiered governance: Bronze, Silver, Gold)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS customer_tiers;
CREATE TABLE customer_tiers (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(32)   NOT NULL UNIQUE,
    max_discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. CUSTOMERS (Company & Account Master)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id                VARCHAR(36)    PRIMARY KEY,
    company_name      VARCHAR(255)   NOT NULL,
    contact_name      VARCHAR(128),
    email             VARCHAR(128)   NOT NULL UNIQUE,
    phone             VARCHAR(32),
    customer_tier_id  INT            NOT NULL,
    credit_limit      DECIMAL(18, 2) NOT NULL DEFAULT 50000.00,
    status            VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_tier FOREIGN KEY (customer_tier_id) REFERENCES customer_tiers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customers_tier ON customers (customer_tier_id);

-- ----------------------------------------------------------------------------
-- 5. PRODUCT CATEGORIES (Footwear, Toys, Electronics, Hardware, Apparel, etc.)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS product_categories;
CREATE TABLE product_categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. PRODUCTS (Multi-category catalog with cost price, unit price & image)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id           VARCHAR(36)    PRIMARY KEY,
    name         VARCHAR(255)   NOT NULL,
    category_id  INT            NOT NULL,
    sku          VARCHAR(64)    NOT NULL UNIQUE,
    unit_price   DECIMAL(18, 2) NOT NULL,
    cost_price   DECIMAL(18, 2) NOT NULL,
    tax_percent  DECIMAL(5, 2)  NOT NULL DEFAULT 18.00,
    image_url    VARCHAR(500),
    is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories (id),
    CONSTRAINT chk_products_positive_price CHECK (unit_price >= 0 AND cost_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_sku ON products (sku);

-- ----------------------------------------------------------------------------
-- 7. PRICE LISTS (Tier & Customer-specific pricing schedules)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS price_lists;
CREATE TABLE price_lists (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(128) NOT NULL,
    currency          VARCHAR(3)   NOT NULL DEFAULT 'USD',
    customer_tier_id  INT,
    CONSTRAINT fk_pricelists_tier FOREIGN KEY (customer_tier_id) REFERENCES customer_tiers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. PRICE LIST ITEMS (Product line prices)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS price_list_items;
CREATE TABLE price_list_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    price_list_id INT            NOT NULL,
    product_id    VARCHAR(36)    NOT NULL,
    price         DECIMAL(18, 2) NOT NULL,
    valid_from    DATE           NOT NULL,
    valid_to      DATE,
    CONSTRAINT fk_pli_pricelist FOREIGN KEY (price_list_id) REFERENCES price_lists (id) ON DELETE CASCADE,
    CONSTRAINT fk_pli_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pli_pricelist_product ON price_list_items (price_list_id, product_id);

-- ----------------------------------------------------------------------------
-- 9. DISCOUNT RULES (DICE blended discount matrix by Tier & Category)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS discount_rules;
CREATE TABLE discount_rules (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    customer_tier_id     INT            NOT NULL,
    category_id          INT            NOT NULL,
    max_discount_percent DECIMAL(5, 2)  NOT NULL,
    risk_level           VARCHAR(16)    NOT NULL DEFAULT 'LOW',
    CONSTRAINT fk_dr_tier FOREIGN KEY (customer_tier_id) REFERENCES customer_tiers (id),
    CONSTRAINT fk_dr_category FOREIGN KEY (category_id) REFERENCES product_categories (id),
    CONSTRAINT uq_tier_category UNIQUE (customer_tier_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. APPROVAL RULES (DICE Approval Routing Matrix)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS approval_rules;
CREATE TABLE approval_rules (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    min_discount   DECIMAL(5, 2) NOT NULL,
    max_discount   DECIMAL(5, 2) NOT NULL,
    required_role  VARCHAR(64)   NOT NULL,
    approval_level INT           NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. QUOTATIONS (Deal & Proposal Header)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS quotations;
CREATE TABLE quotations (
    id               VARCHAR(36)    PRIMARY KEY,
    quote_number     VARCHAR(32)    NOT NULL UNIQUE,
    customer_id      VARCHAR(36)    NOT NULL,
    sales_rep_id     VARCHAR(36),
    status           VARCHAR(32)    NOT NULL DEFAULT 'DRAFT',
    subtotal         DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    discount_amount  DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    tax_amount       DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_amount     DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    risk_score       INT            NOT NULL DEFAULT 0,
    approval_status  VARCHAR(32)    NOT NULL DEFAULT 'AUTO_APPROVED',
    valid_until      DATE,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotations_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_quotations_rep FOREIGN KEY (sales_rep_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_quotations_status ON quotations (status);
CREATE INDEX idx_quotations_customer ON quotations (customer_id);

-- ----------------------------------------------------------------------------
-- 12. QUOTATION ITEMS (Line-level discount, quantity & margin)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS quotation_items;
CREATE TABLE quotation_items (
    id               VARCHAR(36)    PRIMARY KEY,
    quotation_id     VARCHAR(36)    NOT NULL,
    product_id       VARCHAR(36)    NOT NULL,
    quantity         INT            NOT NULL DEFAULT 1,
    unit_price       DECIMAL(18, 2) NOT NULL,
    discount_percent DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
    discount_amount  DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    tax_amount       DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    line_total       DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    margin           DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_qi_quote FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE,
    CONSTRAINT fk_qi_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_qi_quotation ON quotation_items (quotation_id);

-- ----------------------------------------------------------------------------
-- 13. APPROVAL REQUESTS (DICE Multi-level Workflow State)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS approval_requests;
CREATE TABLE approval_requests (
    id             VARCHAR(36)  PRIMARY KEY,
    quotation_id   VARCHAR(36)  NOT NULL,
    approver_id    VARCHAR(36),
    approval_level INT          NOT NULL DEFAULT 1,
    status         VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    risk_score     INT          NOT NULL DEFAULT 0,
    reason         TEXT,
    acted_at       DATETIME,
    CONSTRAINT fk_ar_quotation FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_approver FOREIGN KEY (approver_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. APPROVAL HISTORY (Audit Trail: User, Timestamp, Reason)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS approval_history;
CREATE TABLE approval_history (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id VARCHAR(36)  NOT NULL,
    user_id      VARCHAR(36),
    action       VARCHAR(32)  NOT NULL,
    old_status   VARCHAR(32),
    new_status   VARCHAR(32),
    reason       TEXT,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ah_quotation FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE,
    CONSTRAINT fk_ah_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ah_quotation ON approval_history (quotation_id);

-- ----------------------------------------------------------------------------
-- 15. NEGOTIATIONS (Customer Negotiation Sessions)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS negotiations;
CREATE TABLE negotiations (
    id           VARCHAR(36) PRIMARY KEY,
    quotation_id VARCHAR(36) NOT NULL,
    customer_id  VARCHAR(36) NOT NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
    started_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    CONSTRAINT fk_neg_quotation FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE,
    CONSTRAINT fk_neg_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. WAREHOUSES (Multi-hub fulfillment centers)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS warehouses;
CREATE TABLE warehouses (
    id            VARCHAR(36)    PRIMARY KEY,
    name          VARCHAR(128)   NOT NULL,
    location      VARCHAR(128)   NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    is_active     BOOLEAN        NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. INVENTORY (Real-time stock by warehouse)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS inventory;
CREATE TABLE inventory (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id       VARCHAR(36) NOT NULL,
    product_id         VARCHAR(36) NOT NULL,
    available_quantity INT         NOT NULL DEFAULT 0,
    reserved_quantity  INT         NOT NULL DEFAULT 0,
    reorder_level      INT         NOT NULL DEFAULT 10,
    CONSTRAINT fk_inv_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT uq_warehouse_product UNIQUE (warehouse_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. SALES ORDERS (Confirmed commercial contracts)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS sales_orders;
CREATE TABLE sales_orders (
    id              VARCHAR(36)    PRIMARY KEY,
    order_number    VARCHAR(32)    NOT NULL UNIQUE,
    quotation_id    VARCHAR(36),
    customer_id     VARCHAR(36)    NOT NULL,
    status          VARCHAR(32)    NOT NULL DEFAULT 'CONFIRMED',
    subtotal        DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    tax_amount      DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_amount    DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    order_date      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_so_quotation FOREIGN KEY (quotation_id) REFERENCES quotations (id),
    CONSTRAINT fk_so_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_so_customer ON sales_orders (customer_id);

-- ----------------------------------------------------------------------------
-- 19. SALES ORDER ITEMS (One-time and Recurring products)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS sales_order_items;
CREATE TABLE sales_order_items (
    id               VARCHAR(36)    PRIMARY KEY,
    sales_order_id   VARCHAR(36)    NOT NULL,
    product_id       VARCHAR(36)    NOT NULL,
    quantity         INT            NOT NULL,
    unit_price       DECIMAL(18, 2) NOT NULL,
    discount_percent DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
    line_total       DECIMAL(18, 2) NOT NULL,
    item_type        VARCHAR(32)    NOT NULL DEFAULT 'ONE_TIME',
    CONSTRAINT fk_soi_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_soi_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 20. SUBSCRIPTIONS (Recurring plans and services)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
    id             VARCHAR(36) PRIMARY KEY,
    customer_id    VARCHAR(36) NOT NULL,
    sales_order_id VARCHAR(36),
    product_id     VARCHAR(36) NOT NULL,
    plan_id        INT,
    quantity       INT         NOT NULL DEFAULT 1,
    start_date     DATE        NOT NULL,
    end_date       DATE,
    status         VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT fk_sub_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_sub_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id),
    CONSTRAINT fk_sub_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- COMPLEMENTARY TABLES (Negotiation Messages, Invoices, Billing Schedules)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS negotiation_messages;
CREATE TABLE negotiation_messages (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    negotiation_id     VARCHAR(36)   NOT NULL,
    quotation_item_id  VARCHAR(36),
    sender_id          VARCHAR(36)   NOT NULL,
    message            TEXT          NOT NULL,
    requested_discount DECIMAL(5, 2),
    created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nm_negotiation FOREIGN KEY (negotiation_id) REFERENCES negotiations (id) ON DELETE CASCADE,
    CONSTRAINT fk_nm_sender FOREIGN KEY (sender_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- AUTOMATED SEED DATA
-- Multi-category Products (Shoes, Toys, Electronics, Apparel, Services),
-- 3-4 Realistic Sales with 5-6% Discounts, and DICE Governance Matrix
-- ============================================================================

-- 1. Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Full system configuration, policy governance, and oversight'),
(2, 'SALES_REP', 'Quote creation, discount proposals, and deal drafting'),
(3, 'SALES_MANAGER', 'Tier 1 discount approval up to 15%'),
(4, 'FINANCE', 'Credit check, margin floor oversight, and deep discount sign-off'),
(5, 'OPERATIONS', 'Warehouse inventory, stock reservations, and logistics fulfillment'),
(6, 'CUSTOMER', 'Customer portal negotiation, quote acceptance, and package review')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 2. Users (BCrypt hash for 'dice-demo')
INSERT INTO users (id, name, email, password_hash, role_id, status) VALUES
('usr-rep-101', 'Arun Rep', 'sales_rep@dice.local', '$2a$10$wE73G8f7u5V4k0fH0qJ.9u8Qf0fQk8b4Cg0pZ4k4X1A0o0vVqC.m6', 2, 'ACTIVE'),
('usr-mgr-102', 'Sarah Jenkins', 'sales_manager@dice.local', '$2a$10$wE73G8f7u5V4k0fH0qJ.9u8Qf0fQk8b4Cg0pZ4k4X1A0o0vVqC.m6', 3, 'ACTIVE'),
('usr-fin-103', 'Elena Vance', 'finance@dice.local', '$2a$10$wE73G8f7u5V4k0fH0qJ.9u8Qf0fQk8b4Cg0pZ4k4X1A0o0vVqC.m6', 4, 'ACTIVE'),
('usr-ops-104', 'Dave Logistics', 'operations@dice.local', '$2a$10$wE73G8f7u5V4k0fH0qJ.9u8Qf0fQk8b4Cg0pZ4k4X1A0o0vVqC.m6', 5, 'ACTIVE'),
('usr-adm-105', 'System Admin', 'admin@dice.local', '$2a$10$wE73G8f7u5V4k0fH0qJ.9u8Qf0fQk8b4Cg0pZ4k4X1A0o0vVqC.m6', 1, 'ACTIVE'),
('usr-cst-106', 'Acme Purchaser', 'customer@dice.local', '$2a$10$wE73G8f7u5V4k0fH0qJ.9u8Qf0fQk8b4Cg0pZ4k4X1A0o0vVqC.m6', 6, 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. Customer Tiers (5% Bronze, 10% Silver, 15% Gold)
INSERT INTO customer_tiers (id, name, max_discount_percent) VALUES
(1, 'BRONZE', 5.00),
(2, 'SILVER', 10.00),
(3, 'GOLD', 15.00)
ON DUPLICATE KEY UPDATE max_discount_percent=VALUES(max_discount_percent);

-- 4. Customers
INSERT INTO customers (id, company_name, contact_name, email, phone, customer_tier_id, credit_limit, status) VALUES
('cust-acme-01', 'Acme Global Corp', 'Robert Acme', 'purchasing@acmecorp.com', '+1-555-0199', 3, 1000000.00, 'ACTIVE'),
('cust-beta-02', 'Beta Industries Ltd', 'Alicia Beta', 'procurement@betaind.com', '+1-555-0245', 2, 500000.00, 'ACTIVE'),
('cust-gamma-03', 'Gamma Retailers Co', 'George Gamma', 'orders@gammaretail.com', '+1-555-0371', 1, 100000.00, 'ACTIVE'),
('cust-delta-04', 'Delta Enterprise Solutions', 'Diana Delta', 'diana@deltasolutions.com', '+1-555-0482', 3, 750000.00, 'ACTIVE')
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);

-- 5. Product Categories
INSERT INTO product_categories (id, name, description) VALUES
(1, 'Footwear & Shoes', 'Performance running shoes, leather formal boots, and athletic footwear'),
(2, 'Toys & Games', 'Robotic educational STEM kits, RC drones, and programmable puzzle toys'),
(3, 'Consumer Electronics', 'High-end displays, mechanical keyboards, audio gear, and peripherals'),
(4, 'Enterprise Hardware', 'Blade servers, edge AI compute racks, and redundant network switches'),
(5, 'Apparel & Sportswear', 'All-weather jackets, technical activewear, and branded uniforms'),
(6, 'Cloud & Subscriptions', '24/7 Enterprise SLA support, offsite backup, and predictive CPQ subscriptions')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 6. Products (Not only electronics, but also SHOES, TOYS, APPAREL & SERVICES with image URLs)
INSERT INTO products (id, name, category_id, sku, unit_price, cost_price, tax_percent, image_url, is_active) VALUES
-- Footwear & Shoes
('prod-shoe-101', 'Air-Velocity Pro Running Shoes', 1, 'SHOE-AIR-101', 140.00, 60.00, 12.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', TRUE),
('prod-shoe-102', 'Classic Leather Oxford Dress Shoes', 1, 'SHOE-OXF-102', 195.00, 85.00, 12.00, 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80', TRUE),
('prod-shoe-103', 'All-Terrain Waterproof Trail Boots', 1, 'SHOE-TRL-103', 175.00, 75.00, 12.00, 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80', TRUE),

-- Toys & Games
('prod-toy-201', 'STEM AI Robotics Explorer Kit', 2, 'TOY-ROBO-201', 125.00, 52.00, 18.00, 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&auto=format&fit=crop&q=80', TRUE),
('prod-toy-202', '4K Camera Programmable Quadcopter Drone', 2, 'TOY-DRON-202', 280.00, 130.00, 18.00, 'https://images.unsplash.com/photo-1507582020432-2a3bc4ff7ac8?w=600&auto=format&fit=crop&q=80', TRUE),
('prod-toy-203', 'Interactive Mechanical Gravity Marble Track', 2, 'TOY-TRK-203', 65.00, 26.00, 18.00, 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&auto=format&fit=crop&q=80', TRUE),

-- Consumer Electronics & Peripherals
('prod-elec-301', 'Ultra-Curved 34" Gaming & CAD Monitor', 3, 'ELEC-MON-301', 650.00, 390.00, 18.00, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80', TRUE),
('prod-elec-302', 'Wireless Noise-Canceling Studio Headset', 3, 'ELEC-AUD-302', 220.00, 95.00, 18.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', TRUE),

-- Enterprise Hardware
('prod-hw-401', 'DICE Edge Compute Dual-Socket Server 2U', 4, 'HW-SRV-401', 5200.00, 3400.00, 18.00, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80', TRUE),

-- Apparel
('prod-app-501', 'WeatherShield Performance Thermal Jacket', 5, 'APP-JKT-501', 110.00, 42.00, 12.00, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80', TRUE),

-- Cloud & Subscriptions
('prod-srv-601', 'Enterprise 24/7 Cloud Support SLA Plan', 6, 'SRV-SLA-601', 1200.00, 200.00, 18.00, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name), unit_price=VALUES(unit_price), image_url=VALUES(image_url);

-- 7. Warehouses
INSERT INTO warehouses (id, name, location, shipping_cost, is_active) VALUES
('wh-main-01', 'Main Central Distribution Hub', 'Chicago, IL', 25.00, TRUE),
('wh-east-02', 'East Coast Depot', 'Newark, NJ', 18.00, TRUE),
('wh-west-03', 'Pacific West Fulfillment Center', 'Reno, NV', 20.00, TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8. Inventory Stock
INSERT INTO inventory (warehouse_id, product_id, available_quantity, reserved_quantity, reorder_level) VALUES
('wh-main-01', 'prod-shoe-101', 350, 20, 50),
('wh-east-02', 'prod-shoe-101', 200, 10, 30),
('wh-main-01', 'prod-shoe-102', 180, 15, 25),
('wh-main-01', 'prod-toy-201', 400, 40, 50),
('wh-east-02', 'prod-toy-202', 150, 12, 20),
('wh-west-03', 'prod-elec-301', 90, 8, 15),
('wh-main-01', 'prod-hw-401', 45, 5, 10),
('wh-main-01', 'prod-app-501', 500, 25, 60)
ON DUPLICATE KEY UPDATE available_quantity=VALUES(available_quantity);

-- 9. Discount Governance Rules (DICE Multi-Tier Matrix)
INSERT INTO discount_rules (customer_tier_id, category_id, max_discount_percent, risk_level) VALUES
(1, 1, 5.00, 'LOW'),     -- Bronze + Footwear: 5% Max
(1, 2, 5.00, 'LOW'),     -- Bronze + Toys: 5% Max
(1, 3, 5.00, 'LOW'),     -- Bronze + Electronics: 5% Max
(2, 1, 10.00, 'MEDIUM'), -- Silver + Footwear: 10% Max
(2, 2, 10.00, 'MEDIUM'), -- Silver + Toys: 10% Max
(2, 3, 8.00, 'MEDIUM'),  -- Silver + Electronics: 8% Max
(3, 1, 15.00, 'HIGH'),   -- Gold + Footwear: 15% Max
(3, 2, 15.00, 'HIGH'),   -- Gold + Toys: 15% Max
(3, 3, 12.00, 'HIGH'),   -- Gold + Electronics: 12% Max
(3, 4, 10.00, 'HIGH')    -- Gold + Enterprise Hardware: 10% Max
ON DUPLICATE KEY UPDATE max_discount_percent=VALUES(max_discount_percent);

-- 10. Approval Routing Rules
INSERT INTO approval_rules (id, min_discount, max_discount, required_role, approval_level) VALUES
(1, 0.00, 6.00, 'NONE', 0),                  -- 0-6%: Auto Approved (Standard Governance Benchmark)
(2, 6.01, 12.00, 'SALES_MANAGER', 1),        -- 6-12%: Sales Manager
(3, 12.01, 20.00, 'SALES_MANAGER,FINANCE', 2), -- 12-20%: Sales Manager + Finance
(4, 20.01, 50.00, 'FINANCE', 3)              -- 20%+: Executive Finance Signoff
ON DUPLICATE KEY UPDATE max_discount=VALUES(max_discount);

-- 11. Quotations (Seeded 3-4 commercial deals around 5-6% discount governance)
INSERT INTO quotations (id, quote_number, customer_id, sales_rep_id, status, subtotal, discount_amount, tax_amount, total_amount, risk_score, approval_status, valid_until) VALUES
-- Sale 1: Footwear & Apparel Deal (5.0% discount - Auto Approved benchmark)
('qt-1001-shoe', 'Q-1001', 'cust-acme-01', 'usr-rep-101', 'CONFIRMED', 14000.00, 700.00, 1596.00, 14896.00, 18, 'APPROVED', DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)),

-- Sale 2: Educational STEM Toys & Drone Kit (5.5% discount)
('qt-1002-toy', 'Q-1002', 'cust-beta-02', 'usr-rep-101', 'CONFIRMED', 8400.00, 462.00, 1428.84, 9366.84, 24, 'APPROVED', DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)),

-- Sale 3: Consumer Electronics & Displays (6.0% discount)
('qt-1003-elec', 'Q-1003', 'cust-delta-04', 'usr-rep-101', 'CONFIRMED', 19500.00, 1170.00, 3299.40, 21629.40, 32, 'APPROVED', DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)),

-- Sale 4: Hybrid Enterprise Bundle (Shoes, Electronics & SLA Subscription) - In Negotiation
('qt-1004-hyb', 'Q-1004', 'cust-acme-01', 'usr-rep-101', 'UNDER_NEGOTIATION', 31200.00, 1716.00, 5307.12, 34791.12, 42, 'PENDING_APPROVAL', DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY))
ON DUPLICATE KEY UPDATE quote_number=VALUES(quote_number);

-- 12. Quotation Items
INSERT INTO quotation_items (id, quotation_id, product_id, quantity, unit_price, discount_percent, discount_amount, tax_amount, line_total, margin) VALUES
-- Line items for Q-1001 (100 pairs of Air-Velocity Shoes @ 5.0% discount)
('qi-1001-1', 'qt-1001-shoe', 'prod-shoe-101', 100, 140.00, 5.00, 700.00, 1596.00, 14896.00, 55.00),

-- Line items for Q-1002 (40 STEM Robot kits + 12 Quadcopter Drones @ 5.5% discount)
('qi-1002-1', 'qt-1002-toy', 'prod-toy-201', 40, 125.00, 5.50, 275.00, 850.50, 5575.50, 56.00),
('qi-1002-2', 'qt-1002-toy', 'prod-toy-202', 12, 280.00, 5.50, 184.80, 578.34, 3753.54, 51.50),

-- Line items for Q-1003 (30 Ultra-Curved Monitors @ 6.0% discount)
('qi-1003-1', 'qt-1003-elec', 'prod-elec-301', 30, 650.00, 6.00, 1170.00, 3299.40, 21629.40, 36.20),

-- Line items for Q-1004 (Hybrid package: 50 Shoes + 10 Displays + 5 Cloud Support plans)
('qi-1004-1', 'qt-1004-hyb', 'prod-shoe-102', 50, 195.00, 5.50, 536.25, 1105.65, 10319.40, 53.80),
('qi-1004-2', 'qt-1004-hyb', 'prod-elec-301', 10, 650.00, 5.50, 357.50, 1105.65, 7248.15, 36.50),
('qi-1004-3', 'qt-1004-hyb', 'prod-srv-601', 12, 1200.00, 5.50, 792.00, 2449.44, 16057.44, 82.00)
ON DUPLICATE KEY UPDATE line_total=VALUES(line_total);

-- 13. Sales Orders (The 3 Confirmed Sales)
INSERT INTO sales_orders (id, order_number, quotation_id, customer_id, status, subtotal, discount_amount, tax_amount, total_amount, order_date) VALUES
('so-3001', 'SO-2026-001', 'qt-1001-shoe', 'cust-acme-01', 'CONFIRMED', 14000.00, 700.00, 1596.00, 14896.00, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('so-3002', 'SO-2026-002', 'qt-1002-toy', 'cust-beta-02', 'CONFIRMED', 8400.00, 462.00, 1428.84, 9366.84, DATE_SUB(NOW(), INTERVAL 2 DAY)),
('so-3003', 'SO-2026-003', 'qt-1003-elec', 'cust-delta-04', 'CONFIRMED', 19500.00, 1170.00, 3299.40, 21629.40, DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE order_number=VALUES(order_number);

-- 14. Sales Order Items
INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, discount_percent, line_total, item_type) VALUES
('soi-1', 'so-3001', 'prod-shoe-101', 100, 140.00, 5.00, 14896.00, 'ONE_TIME'),
('soi-2', 'so-3002', 'prod-toy-201', 40, 125.00, 5.50, 5575.50, 'ONE_TIME'),
('soi-3', 'so-3002', 'prod-toy-202', 12, 280.00, 5.50, 3753.54, 'ONE_TIME'),
('soi-4', 'so-3003', 'prod-elec-301', 30, 650.00, 6.00, 21629.40, 'ONE_TIME')
ON DUPLICATE KEY UPDATE line_total=VALUES(line_total);

-- 15. Subscriptions
INSERT INTO subscriptions (id, customer_id, sales_order_id, product_id, plan_id, quantity, start_date, end_date, status) VALUES
('sub-5001', 'cust-acme-01', 'so-3001', 'prod-srv-601', 1, 1, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR), 'ACTIVE')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 16. Customer Negotiations & Line Messages
INSERT INTO negotiations (id, quotation_id, customer_id, status, started_at) VALUES
('neg-7001', 'qt-1004-hyb', 'cust-acme-01', 'IN_PROGRESS', NOW())
ON DUPLICATE KEY UPDATE status=VALUES(status);

INSERT INTO negotiation_messages (id, negotiation_id, quotation_item_id, sender_id, message, requested_discount, created_at) VALUES
(1, 'neg-7001', 'qi-1004-1', 'usr-cst-106', 'We are ordering 50 pairs of shoes and 10 displays. Can we get 6.0% discount across the whole package?', 6.00, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 'neg-7001', 'qi-1004-1', 'usr-rep-101', '6% package discount is within our DICE auto-approval threshold. Applying now for your review!', 6.00, DATE_SUB(NOW(), INTERVAL 1 HOUR))
ON DUPLICATE KEY UPDATE message=VALUES(message);

-- 17. Approval History (Audit Trail)
INSERT INTO approval_history (quotation_id, user_id, action, old_status, new_status, reason, created_at) VALUES
('qt-1001-shoe', 'usr-rep-101', 'SUBMITTED', 'DRAFT', 'CONFIRMED', '5.0% discount complies with Gold Tier governance limits.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('qt-1002-toy', 'usr-rep-101', 'SUBMITTED', 'DRAFT', 'CONFIRMED', '5.5% discount complies with Silver Tier toy catalog rules.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('qt-1003-elec', 'usr-rep-101', 'SUBMITTED', 'DRAFT', 'CONFIRMED', '6.0% discount approved under standard threshold.', DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE action=VALUES(action);
