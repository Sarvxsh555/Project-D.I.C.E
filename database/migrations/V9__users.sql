-- Canonical user profiles. Authentication remains the in-memory demo store in
-- SecurityConfig; this table is the durable identity referenced by username
-- from deals.owner_username and other audit columns. No FK is drawn from
-- those columns to this table yet: Odoo-synced deals can carry a username
-- DICE has not provisioned a profile for.

CREATE TABLE users (
    id          CHAR(36)     PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    full_name   VARCHAR(255) NOT NULL,
    role        VARCHAR(32)  NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_valid CHECK (role IN (
        'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN', 'CUSTOMER'
    ))
);

CREATE INDEX idx_users_role ON users (role);
