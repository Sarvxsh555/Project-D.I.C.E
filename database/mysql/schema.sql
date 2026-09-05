-- D.I.C.E. MySQL 8.4 Schema Definition (dealflow360)
-- Native MySQL DDL with utf8mb4 character set

CREATE DATABASE IF NOT EXISTS dealflow360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dealflow360;

-- 1. Customers
CREATE TABLE IF NOT EXISTS customers (
    id                    BINARY(16) PRIMARY KEY,
    odoo_partner_id       BIGINT UNIQUE,
    name                  VARCHAR(255)   NOT NULL,
    segment               VARCHAR(32)    NOT NULL,
    tier                  VARCHAR(32),
    region                VARCHAR(255),
    credit_limit          DECIMAL(18, 2),
    outstanding_balance   DECIMAL(18, 2),
    payment_terms_days    INT,
    risk_score            INT,
    on_time_payment_rate  DECIMAL(5, 2),
    portal_username       VARCHAR(128),
    active                BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at            DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_customers_segment (segment, active)
) ENGINE=InnoDB;

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
    id               BINARY(16) PRIMARY KEY,
    odoo_product_id  BIGINT UNIQUE,
    sku              VARCHAR(64)    NOT NULL UNIQUE,
    name             VARCHAR(255)   NOT NULL,
    category         VARCHAR(64),
    list_price       DECIMAL(18, 2) NOT NULL,
    standard_cost    DECIMAL(18, 2) NOT NULL,
    floor_price      DECIMAL(18, 2),
    uom              VARCHAR(16)    NOT NULL DEFAULT 'UNIT',
    stock_on_hand    INT            NOT NULL DEFAULT 0,
    lead_time_days   INT            NOT NULL DEFAULT 0,
    active           BOOLEAN        NOT NULL DEFAULT TRUE,
    INDEX idx_products_category (category, active)
) ENGINE=InnoDB;

-- 3. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id                   BINARY(16) PRIMARY KEY,
    odoo_warehouse_id    BIGINT UNIQUE,
    code                 VARCHAR(16)    NOT NULL UNIQUE,
    name                 VARCHAR(255)   NOT NULL,
    region               VARCHAR(255),
    dispatch_days        INT            NOT NULL DEFAULT 1,
    shipping_cost_factor DECIMAL(5, 2)  NOT NULL DEFAULT 1.00,
    active               BOOLEAN        NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 4. Policies
CREATE TABLE IF NOT EXISTS policies (
    id                   BINARY(16) PRIMARY KEY,
    code                 VARCHAR(32)    NOT NULL UNIQUE,
    name                 VARCHAR(255)   NOT NULL,
    category             VARCHAR(32)    NOT NULL,
    rule_type            VARCHAR(32)    NOT NULL,
    severity             VARCHAR(32)    NOT NULL,
    action               VARCHAR(32)    NOT NULL,
    required_role        VARCHAR(32)    NOT NULL,
    threshold_value      DECIMAL(18, 2),
    parameters           JSON,
    priority             INT            NOT NULL DEFAULT 0,
    active               BOOLEAN        NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 5. Deals
CREATE TABLE IF NOT EXISTS deals (
    id                      BINARY(16) PRIMARY KEY,
    deal_number             VARCHAR(64)    NOT NULL UNIQUE,
    odoo_quotation_id       BIGINT UNIQUE,
    customer_id             BINARY(16)     NOT NULL,
    status                  VARCHAR(32)    NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'USD',
    subtotal                DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    discount_amount         DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_amount            DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    margin_percent          DECIMAL(5, 2),
    risk_score              INT,
    risk_level              VARCHAR(16),
    health_score            INT,
    billing_status          VARCHAR(32),
    fulfillment_status      VARCHAR(32),
    requested_delivery_date DATE,
    owner_username          VARCHAR(128),
    created_at              DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_deals_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB;

-- 6. Deal Lines
CREATE TABLE IF NOT EXISTS deal_lines (
    id                      BINARY(16) PRIMARY KEY,
    deal_id                 BINARY(16)     NOT NULL,
    line_number             INT            NOT NULL,
    product_id              BINARY(16)     NOT NULL,
    quantity                INT            NOT NULL,
    unit_price              DECIMAL(18, 2) NOT NULL,
    discount_percent        DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
    line_total              DECIMAL(18, 2) NOT NULL,
    margin_percent          DECIMAL(5, 2),
    warehouse_id            BINARY(16),
    fulfillment_status      VARCHAR(32),
    CONSTRAINT fk_deallines_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_deallines_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_deallines_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
) ENGINE=InnoDB;

-- 7. Evaluations & Decisions
CREATE TABLE IF NOT EXISTS evaluations (
    id                      BINARY(16) PRIMARY KEY,
    deal_id                 BINARY(16)     NOT NULL,
    triggered_by            VARCHAR(64)    NOT NULL,
    margin_percent          DECIMAL(5, 2),
    discount_percent        DECIMAL(5, 2),
    risk_score              INT,
    risk_level              VARCHAR(16),
    health_score            INT,
    outcome                 VARCHAR(32)    NOT NULL,
    policy_results          JSON,
    created_at              DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_evaluations_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS decisions (
    id                      BINARY(16) PRIMARY KEY,
    deal_id                 BINARY(16)     NOT NULL,
    evaluation_id           BINARY(16),
    outcome                 VARCHAR(32)    NOT NULL,
    rationale               TEXT,
    created_at              DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_decisions_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Approvals & Snapshots
CREATE TABLE IF NOT EXISTS approvals (
    id                      BINARY(16) PRIMARY KEY,
    deal_id                 BINARY(16)     NOT NULL,
    evaluation_id           BINARY(16),
    policy_code             VARCHAR(32),
    required_role           VARCHAR(32)    NOT NULL,
    approval_level          VARCHAR(32)    NOT NULL,
    status                  VARCHAR(32)    NOT NULL,
    requested_by            VARCHAR(128)   NOT NULL,
    reason                  TEXT,
    requested_at            DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    sla_due_at              DATETIME(6),
    decided_by              VARCHAR(128),
    decision_reason         TEXT,
    decided_at              DATETIME(6),
    CONSTRAINT fk_approvals_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Users
CREATE TABLE IF NOT EXISTS users (
    id                      BINARY(16) PRIMARY KEY,
    username                VARCHAR(64)    NOT NULL UNIQUE,
    full_name               VARCHAR(128)   NOT NULL,
    email                   VARCHAR(128)   NOT NULL UNIQUE,
    role                    VARCHAR(32)    NOT NULL,
    active                  BOOLEAN        NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 10. Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
    id                      BINARY(16) PRIMARY KEY,
    aggregate_type          VARCHAR(64)    NOT NULL,
    aggregate_id            BINARY(16)     NOT NULL,
    event_type              VARCHAR(64)    NOT NULL,
    actor                   VARCHAR(128)   NOT NULL,
    old_value               TEXT,
    new_value               TEXT,
    reason                  TEXT,
    occurred_at             DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_audit_aggregate (aggregate_type, aggregate_id)
) ENGINE=InnoDB;
