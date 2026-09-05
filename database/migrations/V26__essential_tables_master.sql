-- ============================================================================
-- V26: Essential 20 Core Tables & Catalog Alignment
-- Ensures the 20 Essential Tables exist cleanly alongside legacy migrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_tiers (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(32)   NOT NULL UNIQUE,
    max_discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add image_url to products table if missing
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'image_url');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE products ADD COLUMN image_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Discount rules table
CREATE TABLE IF NOT EXISTS discount_rules (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    customer_tier_id     INT            NOT NULL,
    category_id          INT            NOT NULL,
    max_discount_percent DECIMAL(5, 2)  NOT NULL,
    risk_level           VARCHAR(16)    NOT NULL DEFAULT 'LOW'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Approval rules table
CREATE TABLE IF NOT EXISTS approval_rules (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    min_discount   DECIMAL(5, 2) NOT NULL,
    max_discount   DECIMAL(5, 2) NOT NULL,
    required_role  VARCHAR(64)   NOT NULL,
    approval_level INT           NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id              VARCHAR(36)    PRIMARY KEY,
    order_number    VARCHAR(32)    NOT NULL UNIQUE,
    quotation_id    VARCHAR(36),
    customer_id     VARCHAR(36)    NOT NULL,
    status          VARCHAR(32)    NOT NULL DEFAULT 'CONFIRMED',
    subtotal        DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    tax_amount      DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_amount    DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    order_date      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_order_items (
    id               VARCHAR(36)    PRIMARY KEY,
    sales_order_id   VARCHAR(36)    NOT NULL,
    product_id       VARCHAR(36)    NOT NULL,
    quantity         INT            NOT NULL,
    unit_price       DECIMAL(18, 2) NOT NULL,
    discount_percent DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
    line_total       DECIMAL(18, 2) NOT NULL,
    item_type        VARCHAR(32)    NOT NULL DEFAULT 'ONE_TIME'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
