-- Adapted from feature/dbinit's V9__enterprise_hardening.sql. That branch
-- rewrote the schema from scratch under different table/column names
-- (users/tiers/customers/deals with owner_id, net_amount, approval_status as
-- a column, etc.) — incompatible with the JPA entities actually running on
-- this schema, so it could not be merged as written. The underlying hardening
-- ideas were sound; this re-targets the genuinely portable ones at the real,
-- running schema instead. See PR for the full reconciliation notes.
--
-- Not carried forward: JSONB GIN indexes (no JSONB columns exist here — the
-- audit/decision payload columns are TEXT, not jsonb), the inventory
-- reservation trigger (no separate inventory table — stock_on_hand lives
-- directly on products), and version-column additions (deals already has
-- @Version from V2).

-- ------------------------------------------------------------------------------
-- 1. FK INDEX COVERAGE — the ones actually missing on this schema
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_deal_lines_product ON deal_lines (product_id);
CREATE INDEX IF NOT EXISTS idx_deal_lines_warehouse ON deal_lines (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list ON price_list_items (price_list_id);
CREATE INDEX IF NOT EXISTS idx_approval_snapshots_evaluation ON approval_snapshots (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_approvals_evaluation ON approvals (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_installments_schedule ON invoice_installments (schedule_id);
CREATE INDEX IF NOT EXISTS idx_shipments_deal_line ON shipments (deal_line_id);
CREATE INDEX IF NOT EXISTS idx_shipments_warehouse ON shipments (warehouse_id);

-- ------------------------------------------------------------------------------
-- 2. AUTOMATED updated_at TRIGGERS
--
-- Belt-and-suspenders: Deal.onUpdate()/User's equivalent already set this at
-- the application layer on every JPA write. This catches anything that
-- writes SQL directly (DevDataSeeder's raw scripts, a future admin tool)
-- without needing every such writer to remember it by hand. Only applied to
-- the two tables that actually have an updated_at column.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deals_set_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. EMAIL FORMAT VALIDATION
-- customers has no email column on this schema — only users does.
-- ------------------------------------------------------------------------------
ALTER TABLE users ADD CONSTRAINT chk_users_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
