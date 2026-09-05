-- Commit 23: rule-based discount anomaly alerts.

CREATE TABLE anomaly_alerts (
    id            UUID PRIMARY KEY,
    deal_id       UUID           NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
    metric        VARCHAR(64)    NOT NULL,
    baseline      NUMERIC(18, 6) NOT NULL,
    current_value NUMERIC(18, 6) NOT NULL,
    ratio         NUMERIC(10, 4) NOT NULL,
    severity      VARCHAR(16)    NOT NULL,
    reason        TEXT,
    resolved      BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomaly_alerts_deal ON anomaly_alerts (deal_id);
CREATE INDEX idx_anomaly_alerts_deal_metric_open ON anomaly_alerts (deal_id, metric, resolved);

-- Note: dedup of open (unresolved) alerts per deal/metric is enforced in
-- DiscountAnomalyService (check-before-insert), not a DB constraint — a
-- partial unique index here is not portable to the H2 test profile.
