-- Adapted from feature/dbinit's V9__enterprise_hardening.sql. That branch
-- rewrote the schema from scratch under different table/column names
-- (users/tiers/customers/deals with owner_id, net_amount, approval_status as
-- a column, etc.) — incompatible with the JPA entities actually running on
-- this schema, so it could not be merged as written. The underlying hardening
-- ideas were sound; this re-targets the genuinely portable ones at the real,
-- running schema instead. See PR for the full reconciliation notes.
--
-- Not carried forward: JSON GIN-style indexes (no JSON columns exist here —
-- the audit/decision payload columns are TEXT, not JSON), the inventory
-- reservation trigger (no separate inventory table — stock_on_hand lives
-- directly on products), and version-column additions (deals already has
-- @Version from V2).
--
-- FK index coverage (the original point of section 1 here) is a non-issue on
-- MySQL/InnoDB: every FOREIGN KEY constraint added in the earlier migrations
-- of this port automatically creates a covering index, unlike Postgres where
-- indexes on FK columns are never implicit. Nothing to add here.

-- ------------------------------------------------------------------------------
-- AUTOMATED updated_at TRIGGERS
--
-- Belt-and-suspenders: Deal.onUpdate()/User's equivalent already set this at
-- the application layer on every JPA write. This catches anything that
-- writes SQL directly (DevDataSeeder's raw scripts, a future admin tool)
-- without needing every such writer to remember it by hand. Only applied to
-- the two tables that actually have an updated_at column.
--
-- MySQL triggers are simpler than Postgres's: no separate trigger function,
-- just a statement directly on the trigger.
-- ------------------------------------------------------------------------------
CREATE TRIGGER trg_deals_set_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    SET NEW.updated_at = CURRENT_TIMESTAMP;

CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    SET NEW.updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------------------------
-- EMAIL FORMAT VALIDATION
-- customers has no email column on this schema — only users does.
-- ------------------------------------------------------------------------------
ALTER TABLE users ADD CONSTRAINT chk_users_email_format
    CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
