-- Closes the gap flagged in docs/decision-contract.md: RiskEngine already
-- computes a real 0-100 score on every evaluation, but until now nothing
-- persisted it (only the LOW/MODERATE/HIGH/CRITICAL bucket survived). Mirrors
-- the existing pattern of margin_percent/risk_level/health_score living on
-- both `deals` (current live state) and `evaluations` (point-in-time history).
ALTER TABLE deals ADD COLUMN risk_score INTEGER;
ALTER TABLE evaluations ADD COLUMN risk_score INTEGER;

-- A snapshot of the approval-sensitive deal state at the moment an approval
-- was fully granted. Re-evaluation compares the live deal against the active
-- (not-yet-superseded) snapshot to decide whether the approval still covers
-- the current state — see MaterialChangeDetector.
--
-- line_snapshot is a JSON array of {productId, quantity, unitPrice,
-- discountPercent} — TEXT rather than JSON for the same reason as
-- evaluations.policy_results: nothing queries into it server-side, and the
-- shape can evolve without a migration.
--
-- customer_payment_terms_days captures the customer's terms at approval time
-- as a proxy for "payment terms" (deals do not carry their own payment-terms
-- override today — see docs/decision-contract.md).
CREATE TABLE approval_snapshots (
    id                            CHAR(36)       PRIMARY KEY,
    deal_id                       CHAR(36)       NOT NULL,
    evaluation_id                 CHAR(36),
    approved_by_role              VARCHAR(64)    NOT NULL,
    subtotal                      NUMERIC(18, 2) NOT NULL,
    discount_amount               NUMERIC(18, 2) NOT NULL,
    total_amount                  NUMERIC(18, 2) NOT NULL,
    margin_percent                NUMERIC(7, 4)  NOT NULL,
    risk_score                    INTEGER,
    risk_level                    VARCHAR(16)    NOT NULL,
    customer_payment_terms_days   INTEGER,
    line_snapshot                 TEXT           NOT NULL,
    captured_at                   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    superseded                    BOOLEAN        NOT NULL DEFAULT FALSE,
    superseded_at                 DATETIME,
    superseded_reason             TEXT,
    -- MySQL has no partial/filtered index. This generated column collapses to
    -- NULL for superseded rows, and MySQL (like Postgres) never counts NULLs
    -- against a UNIQUE index — so a unique index on this column reproduces
    -- exactly Postgres's `UNIQUE (deal_id) WHERE NOT superseded` semantics:
    -- at most one active snapshot per deal, any number of superseded ones.
    active_deal_id                CHAR(36) GENERATED ALWAYS AS
        (CASE WHEN NOT superseded THEN deal_id END) STORED,

    -- No ON DELETE CASCADE here: MySQL/InnoDB refuses a CASCADE or SET NULL
    -- foreign-key action on a column a generated column depends on
    -- (active_deal_id depends on deal_id), unlike Postgres which allows it.
    -- Deals are never hard-deleted by this application, so the cascade was
    -- never exercised in practice; RESTRICT (the default) is safe here.
    CONSTRAINT fk_approval_snapshots_deal FOREIGN KEY (deal_id) REFERENCES deals (id),
    CONSTRAINT fk_approval_snapshots_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE SET NULL
);

CREATE INDEX idx_approval_snapshots_deal ON approval_snapshots (deal_id);

-- Enforces at application-invariant level, not just in code: a deal can have
-- at most one *active* snapshot at a time. A second APPROVED cycle first
-- supersedes the old row, then inserts a new one — never two live at once.
CREATE UNIQUE INDEX idx_approval_snapshots_one_active
    ON approval_snapshots (active_deal_id);
